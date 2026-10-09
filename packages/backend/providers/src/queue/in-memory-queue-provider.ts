import type {
  ClaimDueInput,
  ClaimedJob,
  Clock,
  CompleteJobInput,
  EnqueuedJob,
  FailedJob,
  FailJobInput,
  JobEnvelope,
  QueueProvider,
  ReclaimedJobs,
} from '@dttm/contracts'
import { ConflictError, err, NotFoundError, ok, type Result } from '@dttm/types'

const WORKER_DIED = 'the worker holding the lease died before finishing'

interface StoredJob {
  id: string
  type: ClaimedJob['type']
  payload: unknown
  status: 'queued' | 'claimed' | 'done' | 'dead'
  attempts: number
  maxAttempts: number
  idempotencyKey: string
  runAt: Date
  lockToken: string | null
  lockedUntil: Date | null
  lastError: string | null
}

/**
 * The queue held in a map, and a test double only: the factory never selects it, because work held
 * in a process is work that disappears, and a queue that loses jobs is the one thing the pipeline
 * exists to prevent. It is here so the engine can be tested without a database at all.
 *
 * It implements the same lease semantics as the persistent adapter, including the conflict a
 * worker gets when it tries to finish a job whose lease has moved on, because an engine tested
 * against a fake with looser semantics is an engine whose failure modes were never exercised.
 */
export class InMemoryQueueProvider implements QueueProvider {
  private readonly jobs = new Map<string, StoredJob>()
  private readonly clock: Clock
  private counter = 0

  constructor(options: { clock: Clock }) {
    this.clock = options.clock
  }

  enqueue(input: JobEnvelope): Promise<Result<EnqueuedJob>> {
    const existing = [...this.jobs.values()].find(
      (job) => job.idempotencyKey === input.idempotencyKey
    )
    if (existing !== undefined) {
      return Promise.resolve(
        ok({
          id: existing.id,
          type: existing.type,
          status: existing.status,
          idempotencyKey: existing.idempotencyKey,
          deduplicated: true,
        })
      )
    }

    this.counter += 1
    const job: StoredJob = {
      id: `job_${this.counter}`,
      type: input.type,
      payload: input.payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: input.maxAttempts,
      idempotencyKey: input.idempotencyKey,
      runAt: this.clock.now(),
      lockToken: null,
      lockedUntil: null,
      lastError: null,
    }
    this.jobs.set(job.id, job)
    return Promise.resolve(
      ok({
        id: job.id,
        type: job.type,
        status: job.status,
        idempotencyKey: job.idempotencyKey,
        deduplicated: false,
      })
    )
  }

  claimDue(input: ClaimDueInput): Promise<Result<ClaimedJob[]>> {
    const due = [...this.jobs.values()]
      .filter((job) => job.status === 'queued' && job.runAt.getTime() <= input.now.getTime())
      .sort((left, right) => left.runAt.getTime() - right.runAt.getTime())
      .slice(0, input.limit)

    const claimed: ClaimedJob[] = due.map((job) => {
      job.status = 'claimed'
      job.attempts += 1
      job.lockToken = input.lockToken
      job.lockedUntil = new Date(input.now.getTime() + input.leaseSeconds * 1000)
      return {
        id: job.id,
        type: job.type,
        payload: job.payload,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        idempotencyKey: job.idempotencyKey,
        lockToken: input.lockToken,
      }
    })
    return Promise.resolve(ok(claimed))
  }

  complete(input: CompleteJobInput): Promise<Result<void>> {
    const job = this.jobs.get(input.jobId)
    if (job === undefined) return Promise.resolve(err(new NotFoundError('Job', input.jobId)))
    if (job.lockToken !== input.lockToken) {
      return Promise.resolve(
        err(new ConflictError(`Lease on job ${input.jobId} is no longer held`))
      )
    }
    job.status = 'done'
    job.lockToken = null
    job.lockedUntil = null
    return Promise.resolve(ok(undefined))
  }

  fail(input: FailJobInput): Promise<Result<FailedJob>> {
    const job = this.jobs.get(input.jobId)
    if (job === undefined) return Promise.resolve(err(new NotFoundError('Job', input.jobId)))
    if (job.lockToken !== input.lockToken) {
      return Promise.resolve(
        err(new ConflictError(`Lease on job ${input.jobId} is no longer held`))
      )
    }

    job.lastError = input.error
    job.lockToken = null
    job.lockedUntil = null
    if (input.retryInSeconds === undefined) {
      job.status = 'dead'
      job.runAt = input.now
    } else {
      job.status = 'queued'
      job.runAt = new Date(input.now.getTime() + input.retryInSeconds * 1000)
    }
    return Promise.resolve(
      ok({ id: job.id, status: job.status, attempts: job.attempts, runAt: job.runAt })
    )
  }

  reclaimExpired(input: { now: Date; limit: number }): Promise<Result<ReclaimedJobs>> {
    const expired = [...this.jobs.values()]
      .filter(
        (job) =>
          job.status === 'claimed' &&
          job.lockedUntil !== null &&
          job.lockedUntil.getTime() <= input.now.getTime()
      )
      .slice(0, input.limit)

    const dead: ClaimedJob[] = []
    for (const job of expired) {
      const exhausted = job.attempts >= job.maxAttempts
      job.status = exhausted ? 'dead' : 'queued'
      job.lockToken = null
      job.lockedUntil = null
      job.runAt = input.now
      if (exhausted) {
        job.lastError = WORKER_DIED
        dead.push({
          id: job.id,
          type: job.type,
          payload: job.payload,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          idempotencyKey: job.idempotencyKey,
          lockToken: '',
        })
      }
    }
    return Promise.resolve(ok({ requeued: expired.length - dead.length, dead }))
  }

  listDead(input: { limit: number }): Promise<Result<ClaimedJob[]>> {
    const dead = [...this.jobs.values()]
      .filter((job) => job.status === 'dead')
      .slice(0, input.limit)
      .map((job) => ({
        id: job.id,
        type: job.type,
        payload: job.payload,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        idempotencyKey: job.idempotencyKey,
        lockToken: '',
      }))
    return Promise.resolve(ok(dead))
  }
}
