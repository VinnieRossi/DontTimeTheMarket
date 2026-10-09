import { JobStatusSchema } from '@dttm/database'
import type { Result } from '@dttm/types'
import { z } from 'zod'
import type { JobEnvelope } from '../jobs/job'
import { JobTypeSchema } from '../jobs/job'

/**
 * The queue port is the durable pipeline's backbone: a typed seam over an outbox table. The
 * domain enqueues work, a worker claims what is due under a lease, then completes it or fails it
 * with backoff, so no step is lost when a process dies mid-flight.
 *
 * Every method returns a Result rather than throwing, because a lost lease and a storage failure
 * are both ordinary outcomes a caller has to handle rather than exceptions. Job status mirrors
 * the database enum, so there is no second list of states to keep in step.
 */

export const EnqueuedJobSchema = z.object({
  id: z.string().min(1),
  type: JobTypeSchema,
  status: JobStatusSchema,
  idempotencyKey: z.string().min(1),
  /** True when this key was already queued, so the caller knows nothing new was created. */
  deduplicated: z.boolean(),
})
export type EnqueuedJob = z.infer<typeof EnqueuedJobSchema>

export interface ClaimDueInput {
  /** The instant due-ness is measured against. Injected, so claiming is testable. */
  now: Date
  limit: number
  /** The worker's lease token, stamped on each claimed row so completion can prove ownership. */
  lockToken: string
  /** How long the lease holds. A claimed job whose lease elapses is reclaimable. */
  leaseSeconds: number
}

export interface ClaimedJob {
  id: string
  type: JobTypeName
  /** The stored payload, unparsed. The engine re-validates it against its type's schema. */
  payload: unknown
  attempts: number
  maxAttempts: number
  idempotencyKey: string
  lockToken: string
}

export interface CompleteJobInput {
  jobId: string
  lockToken: string
}

export interface FailJobInput {
  jobId: string
  lockToken: string
  error: string
  now: Date
  /** Backoff before the next attempt. Omitted on the attempt that exhausts the budget. */
  retryInSeconds?: number
}

export interface FailedJob {
  id: string
  status: JobStatus
  attempts: number
  runAt: Date
}

/** What one reclaim sweep did: jobs returned to the queue, and jobs retired as out of attempts. */
export interface ReclaimedJobs {
  requeued: number
  dead: ClaimedJob[]
}

export interface QueueProvider {
  /** Enqueue a job. The unique idempotency key makes a duplicate enqueue a no-op. */
  enqueue(input: JobEnvelope): Promise<Result<EnqueuedJob>>
  /** Claim up to `limit` due jobs under a lease, stamping the caller's token on each. */
  claimDue(input: ClaimDueInput): Promise<Result<ClaimedJob[]>>
  /** Mark a claimed job done. Fails with a conflict when the lease no longer holds. */
  complete(input: CompleteJobInput): Promise<Result<void>>
  /** Record a failed attempt, retiring the job as dead once its attempts run out. */
  fail(input: FailJobInput): Promise<Result<FailedJob>>
  /**
   * Return jobs whose lease expired to the queue. A job that has used every attempt is retired as
   * dead instead, because a worker that dies on every attempt is a failure like any other.
   */
  reclaimExpired(input: { now: Date; limit: number }): Promise<Result<ReclaimedJobs>>
  /** Jobs that exhausted their retries and now need someone to look at them. */
  listDead(input: { limit: number }): Promise<Result<ClaimedJob[]>>
}

type JobStatus = z.infer<typeof JobStatusSchema>
type JobTypeName = z.infer<typeof JobTypeSchema>
