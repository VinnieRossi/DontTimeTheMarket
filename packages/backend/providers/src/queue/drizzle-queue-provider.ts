import type {
  ClaimDueInput,
  ClaimedJob,
  Clock,
  CompleteJobInput,
  EnqueuedJob,
  FailedJob,
  FailJobInput,
  IdGenerator,
  JobEnvelope,
  JobTypeName,
  QueueProvider,
  ReclaimedJobs,
} from '@dttm/contracts'
import { type Database, jobs } from '@dttm/database'
import { ConflictError, err, ok, type Result } from '@dttm/types'
import { and, eq, lte, sql } from 'drizzle-orm'
import { wrapExternalCall } from '../errors'

/**
 * The queue as a table. A job is a row, claiming one takes a lease on it, and finishing one has
 * to prove it still holds that lease. This is what makes the pipeline durable: a worker that dies
 * mid-job leaves a row whose lease expires and which the next sweep returns to the queue, rather
 * than work that existed only in a process that is gone.
 *
 * The claim is one statement, not a read followed by a write, because two workers reading the same
 * due rows and then both claiming them is a race that only shows up under load. Rows are locked
 * and skipped rather than waited on, so a second worker takes the next job instead of blocking on
 * the first worker's.
 */
const PROVIDER = 'queue'

const WORKER_DIED = 'the worker holding the lease died before finishing'

interface DrizzleQueueOptions {
  db: Database
  ids: IdGenerator
  clock: Clock
}

export class DrizzleQueueProvider implements QueueProvider {
  private readonly db: Database
  private readonly ids: IdGenerator
  private readonly clock: Clock

  constructor(options: DrizzleQueueOptions) {
    this.db = options.db
    this.ids = options.ids
    this.clock = options.clock
  }

  async enqueue(input: JobEnvelope): Promise<Result<EnqueuedJob>> {
    return wrapExternalCall(PROVIDER, 'could not enqueue the job', async () => {
      const inserted = await this.db
        .insert(jobs)
        .values({
          id: this.ids.next('job'),
          type: input.type,
          payload: JSON.stringify(input.payload),
          maxAttempts: input.maxAttempts,
          idempotencyKey: input.idempotencyKey,
          // Due-ness is measured against the injected clock rather than the database server's,
          // so one clock decides when work runs and a test can pin it.
          runAt: this.clock.now(),
        })
        .onConflictDoNothing({ target: jobs.idempotencyKey })
        .returning()

      const row = inserted[0]
      if (row !== undefined) {
        return {
          id: row.id,
          type: row.type as JobTypeName,
          status: row.status,
          idempotencyKey: row.idempotencyKey,
          deduplicated: false,
        }
      }

      // The key was already queued, so this enqueue is the no-op the key exists to make it.
      const [existing] = await this.db
        .select()
        .from(jobs)
        .where(eq(jobs.idempotencyKey, input.idempotencyKey))
        .limit(1)
      if (existing === undefined) {
        throw new Error(`job with key ${input.idempotencyKey} neither inserted nor found`)
      }
      return {
        id: existing.id,
        type: existing.type as JobTypeName,
        status: existing.status,
        idempotencyKey: existing.idempotencyKey,
        deduplicated: true,
      }
    })
  }

  async claimDue(input: ClaimDueInput): Promise<Result<ClaimedJob[]>> {
    return wrapExternalCall(PROVIDER, 'could not claim due jobs', async () => {
      const lockedUntil = new Date(input.now.getTime() + input.leaseSeconds * 1000)
      const claimed = await this.db.execute<{
        id: string
        type: string
        payload: string
        attempts: number
        max_attempts: number
        idempotency_key: string
      }>(sql`
        update ${jobs}
        set status = 'claimed',
            attempts = ${jobs.attempts} + 1,
            lock_token = ${input.lockToken},
            locked_until = ${lockedUntil},
            updated_at = ${input.now}
        where ${jobs.id} in (
          select ${jobs.id} from ${jobs}
          where ${jobs.status} = 'queued' and ${jobs.runAt} <= ${input.now}
          order by ${jobs.runAt} asc
          limit ${input.limit}
          for update skip locked
        )
        returning ${jobs.id}, ${jobs.type}, ${jobs.payload}, ${jobs.attempts},
                  ${jobs.maxAttempts}, ${jobs.idempotencyKey}
      `)

      return claimed.rows.map((row) => ({
        id: row.id,
        type: row.type as JobTypeName,
        payload: JSON.parse(row.payload) as unknown,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        idempotencyKey: row.idempotency_key,
        lockToken: input.lockToken,
      }))
    })
  }

  async complete(input: CompleteJobInput): Promise<Result<void>> {
    const updated = await wrapExternalCall(
      PROVIDER,
      'could not complete the job',
      async () =>
        await this.db
          .update(jobs)
          .set({ status: 'done', lockToken: null, lockedUntil: null })
          .where(and(eq(jobs.id, input.jobId), eq(jobs.lockToken, input.lockToken)))
          .returning({ id: jobs.id })
    )
    if (!updated.ok) return updated
    if (updated.value.length === 0) {
      return err(new ConflictError(`Lease on job ${input.jobId} is no longer held`))
    }
    return ok(undefined)
  }

  async fail(input: FailJobInput): Promise<Result<FailedJob>> {
    const retryInSeconds = input.retryInSeconds
    const retiring = retryInSeconds === undefined
    const runAt = retiring ? input.now : new Date(input.now.getTime() + retryInSeconds * 1000)

    const updated = await wrapExternalCall(
      PROVIDER,
      'could not record the job failure',
      async () =>
        await this.db
          .update(jobs)
          .set({
            status: retiring ? 'dead' : 'queued',
            lockToken: null,
            lockedUntil: null,
            lastError: input.error,
            runAt,
            updatedAt: input.now,
          })
          .where(and(eq(jobs.id, input.jobId), eq(jobs.lockToken, input.lockToken)))
          .returning({
            id: jobs.id,
            status: jobs.status,
            attempts: jobs.attempts,
            runAt: jobs.runAt,
          })
    )
    if (!updated.ok) return updated

    const row = updated.value[0]
    if (row === undefined) {
      return err(new ConflictError(`Lease on job ${input.jobId} is no longer held`))
    }
    return ok(row)
  }

  async reclaimExpired(input: { now: Date; limit: number }): Promise<Result<ReclaimedJobs>> {
    return wrapExternalCall(PROVIDER, 'could not reclaim expired leases', async () => {
      const reclaimed = await this.db.execute<{
        id: string
        type: string
        payload: string
        attempts: number
        max_attempts: number
        idempotency_key: string
        status: string
      }>(sql`
        update ${jobs}
        set status = case when ${jobs.attempts} >= ${jobs.maxAttempts}
                          then 'dead'::job_status else 'queued'::job_status end,
            last_error = case when ${jobs.attempts} >= ${jobs.maxAttempts}
                              then ${WORKER_DIED} else last_error end,
            lock_token = null,
            locked_until = null,
            run_at = ${input.now},
            updated_at = ${input.now}
        where ${jobs.id} in (
          select ${jobs.id} from ${jobs}
          where ${jobs.status} = 'claimed' and ${jobs.lockedUntil} <= ${input.now}
          limit ${input.limit}
          for update skip locked
        )
        returning ${jobs.id}, ${jobs.type}, ${jobs.payload}, ${jobs.attempts},
                  ${jobs.maxAttempts}, ${jobs.idempotencyKey}, ${jobs.status}
      `)

      const dead = reclaimed.rows
        .filter((row) => row.status === 'dead')
        .map((row) => ({
          id: row.id,
          type: row.type as JobTypeName,
          payload: JSON.parse(row.payload) as unknown,
          attempts: row.attempts,
          maxAttempts: row.max_attempts,
          idempotencyKey: row.idempotency_key,
          lockToken: '',
        }))
      return { requeued: reclaimed.rows.length - dead.length, dead }
    })
  }

  async listDead(input: { limit: number }): Promise<Result<ClaimedJob[]>> {
    return wrapExternalCall(PROVIDER, 'could not list dead jobs', async () => {
      const rows = await this.db
        .select()
        .from(jobs)
        .where(eq(jobs.status, 'dead'))
        .limit(input.limit)
      return rows.map((row) => ({
        id: row.id,
        type: row.type as JobTypeName,
        payload: JSON.parse(row.payload) as unknown,
        attempts: row.attempts,
        maxAttempts: row.maxAttempts,
        idempotencyKey: row.idempotencyKey,
        lockToken: row.lockToken ?? '',
      }))
    })
  }
}

/** Exported so a caller can age a lease deliberately rather than by waiting. */
export const leaseExpiryPredicate = (now: Date) => lte(jobs.lockedUntil, now)
