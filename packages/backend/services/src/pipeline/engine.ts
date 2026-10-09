import {
  type ClaimedJob,
  type FailJobInput,
  JOB_PAYLOAD_SCHEMAS,
  type JobPayload,
  type JobTypeName,
} from '@dttm/contracts'
import { alerts, type Database } from '@dttm/database'
import type { Logger } from '@dttm/logger'
import {
  type AppError,
  ExternalServiceError,
  err,
  ok,
  type Result,
  ValidationError,
} from '@dttm/types'
import type { PipelineContext } from '../context'
import { type JobHandlers, NonRetryableError } from './handlers'

/**
 * The pipeline engine, and the reason this template has one: no step is ever dropped without a
 * trace. A claimed job is completed, requeued with backoff, or retired as dead with an alert
 * somebody can act on. There is no fourth outcome, including when a handler throws something
 * nobody anticipated.
 */

/** The first retry waits this long, and each further attempt doubles it. */
const BASE_BACKOFF_SECONDS = 30
/** The ceiling, so a long-lived job does not push its next attempt arbitrarily far out. */
const MAX_BACKOFF_SECONDS = 3600

/** How long to wait before the next attempt, given the attempt count that just failed. */
export function computeBackoffSeconds(attempts: number): number {
  const doublings = Math.max(0, attempts - 1)
  return Math.min(BASE_BACKOFF_SECONDS * 2 ** doublings, MAX_BACKOFF_SECONDS)
}

/** A readable failure string for the queue's stored error, never empty. */
function describe(error: AppError): string {
  return error.message.length > 0 ? `${error.name}: ${error.message}` : error.code
}

/**
 * Re-validate a stored payload against its type's schema before a handler sees it. The payload
 * crossed a serialization boundary, so it is external input by the time it comes back, and the
 * boundary is where input gets parsed.
 */
function parsePayload<T extends JobTypeName>(type: T, payload: unknown): Result<JobPayload<T>> {
  const parsed = JOB_PAYLOAD_SCHEMAS[type].safeParse(payload)
  if (!parsed.success) {
    return err(new ValidationError(`Malformed payload for job "${type}"`, { cause: parsed.error }))
  }
  return ok(parsed.data as JobPayload<T>)
}

/**
 * Validate, then dispatch. A handler that throws instead of returning a failure is caught here and
 * normalized, so it travels the same retry and dead-letter path as any other failure rather than
 * escaping the run and taking the rest of the batch with it.
 */
async function runOne<T extends JobTypeName>(
  handlers: JobHandlers,
  type: T,
  payload: unknown
): Promise<Result<void>> {
  const parsed = parsePayload(type, payload)
  if (!parsed.ok) return parsed
  try {
    return await handlers[type](parsed.value)
  } catch (cause) {
    return err(new ExternalServiceError(type, `the handler for "${type}" threw`, { cause }))
  }
}

/** Record that a job was given up on, so a dead letter is something a person can find. */
async function raiseDeadLetterAlert(
  db: Database,
  job: ClaimedJob,
  error: AppError,
  reason: string,
  context: { ids: PipelineContext['ids']; clock: PipelineContext['clock']; logger: Logger }
): Promise<void> {
  try {
    await db.insert(alerts).values({
      id: context.ids.next('alert'),
      level: 'error',
      title: `Job ${job.type} was given up on`,
      detail: `Job ${job.id} ${reason}: ${describe(error)}`,
      createdAt: context.clock.now(),
    })
  } catch (cause) {
    // The alert is the trace, so failing to write it is itself worth reporting loudly.
    context.logger.error('could not record the dead-letter alert', {
      jobId: job.id,
      type: job.type,
      error: cause,
    })
  }
}

export interface RunDueJobsInput {
  handlers: JobHandlers
  lockToken: string
  leaseSeconds: number
  limit: number
}

/** What one run did. `claimed` equals the rest added together, plus any lease lost mid-flight. */
export interface RunSummary {
  claimed: number
  completed: number
  /** Failed with attempts left, so requeued with backoff. */
  retried: number
  /** Failed with no attempts left or no chance of succeeding, so retired and alerted on. */
  dead: number
}

/**
 * Claim and run up to `limit` due jobs. A lease lost between the work and the record of it is
 * logged and left for the reclaim sweep rather than forced, because forcing it would overwrite
 * whatever the worker that now holds the lease has done.
 */
export async function runDueJobs(
  input: RunDueJobsInput,
  context: PipelineContext
): Promise<Result<RunSummary>> {
  const now = context.clock.now()
  const claimed = await context.queue.claimDue({
    now,
    limit: input.limit,
    lockToken: input.lockToken,
    leaseSeconds: input.leaseSeconds,
  })
  if (!claimed.ok) {
    context.logger.error('could not claim due jobs', { error: claimed.error })
    return claimed
  }

  const summary: RunSummary = { claimed: claimed.value.length, completed: 0, retried: 0, dead: 0 }

  for (const job of claimed.value) {
    const outcome = await runOne(input.handlers, job.type, job.payload)

    if (outcome.ok) {
      const completed = await context.queue.complete({ jobId: job.id, lockToken: job.lockToken })
      if (completed.ok) {
        summary.completed += 1
        context.logger.debug('job completed', { jobId: job.id, type: job.type })
      } else {
        context.logger.error('job ran but its lease was gone before it could be recorded', {
          jobId: job.id,
          type: job.type,
          error: completed.error,
        })
      }
      continue
    }

    const retryable = !(outcome.error instanceof NonRetryableError)
    const exhausted = !retryable || job.attempts >= job.maxAttempts
    const failure: FailJobInput = exhausted
      ? { jobId: job.id, lockToken: job.lockToken, error: describe(outcome.error), now }
      : {
          jobId: job.id,
          lockToken: job.lockToken,
          error: describe(outcome.error),
          now,
          retryInSeconds: computeBackoffSeconds(job.attempts),
        }

    const failed = await context.queue.fail(failure)
    if (!failed.ok) {
      context.logger.error('job failed but its lease was gone before it could be recorded', {
        jobId: job.id,
        type: job.type,
        error: failed.error,
      })
      continue
    }

    if (failed.value.status === 'dead') {
      summary.dead += 1
      context.logger.error('job given up on', {
        jobId: job.id,
        type: job.type,
        attempts: failed.value.attempts,
        error: outcome.error,
      })
      await raiseDeadLetterAlert(
        context.db,
        job,
        outcome.error,
        retryable ? 'ran out of attempts' : 'cannot succeed on a later attempt',
        context
      )
    } else {
      summary.retried += 1
      context.logger.warn('job failed and was requeued with backoff', {
        jobId: job.id,
        type: job.type,
        attempts: failed.value.attempts,
        nextAttemptAt: failed.value.runAt.toISOString(),
        error: outcome.error,
      })
    }
  }

  return ok(summary)
}

/** What one reclaim sweep did. */
export interface ReclaimSummary {
  /** Returned to the queue to be claimed again. */
  requeued: number
  /** Retired because the worker died on the last attempt, and alerted on. */
  dead: number
}

/**
 * Return jobs whose worker died mid-flight to the queue. Without this sweep, a process killed
 * between claiming a job and finishing it leaves that job claimed forever, which is exactly the
 * silent loss the whole pipeline exists to prevent. A job whose worker has died on every attempt is
 * retired with an alert instead, because handing it back again would loop it forever with no trace.
 */
export async function reclaimStalledJobs(
  limit: number,
  context: PipelineContext
): Promise<Result<ReclaimSummary>> {
  const reclaimed = await context.queue.reclaimExpired({ now: context.clock.now(), limit })
  if (!reclaimed.ok) {
    context.logger.error('could not reclaim stalled jobs', { error: reclaimed.error })
    return reclaimed
  }

  const { requeued, dead } = reclaimed.value
  if (requeued > 0) {
    context.logger.warn('returned stalled jobs to the queue', { count: requeued })
  }
  for (const job of dead) {
    const error = new ExternalServiceError(job.type, 'the worker died before finishing the job')
    context.logger.error('job given up on', {
      jobId: job.id,
      type: job.type,
      attempts: job.attempts,
      error,
    })
    await raiseDeadLetterAlert(context.db, job, error, 'ran out of attempts', context)
  }
  return ok({ requeued, dead: dead.length })
}
