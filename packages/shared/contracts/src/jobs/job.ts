import { ValidationError } from '@dttm/types'
import { z } from 'zod'

/**
 * The durable job contract: the closed set of work the pipeline runs, with each type bound to
 * its payload schema. `buildJob` is the only sanctioned way to make an envelope, so a job cannot
 * reach the queue carrying a payload that does not match its type.
 *
 * One job type ships, because one is enough to establish the pattern. Adding a second means a
 * literal in the list, a schema in the table, and a handler; the `satisfies` checks below turn a
 * missing piece into a compile error rather than a runtime surprise.
 */

export const NoteCreatedPayloadSchema = z.object({
  noteId: z.string().min(1),
  authorId: z.string().min(1),
})
export type NoteCreatedPayload = z.infer<typeof NoteCreatedPayloadSchema>

export const JOB_TYPES = ['note_created'] as const

export const JobTypeSchema = z.enum(JOB_TYPES)
export type JobTypeName = z.infer<typeof JobTypeSchema>

/** Named members for call sites that prefer one over a bare string literal. */
export const JobType = {
  NoteCreated: 'note_created',
} as const satisfies Record<string, JobTypeName>

/** The type-to-schema table. `satisfies` makes a missing entry a compile error. */
export const JOB_PAYLOAD_SCHEMAS = {
  note_created: NoteCreatedPayloadSchema,
} satisfies Record<JobTypeName, z.ZodType>

type JobPayloadSchemas = typeof JOB_PAYLOAD_SCHEMAS

/** The validated payload type for one job type. */
export type JobPayload<T extends JobTypeName> = z.infer<JobPayloadSchemas[T]>

/** A type-tagged job message: the union of every valid type and payload pairing. */
export type JobMessage = {
  [K in JobTypeName]: { type: K; payload: JobPayload<K> }
}[JobTypeName]

export const DEFAULT_MAX_ATTEMPTS = 5

export interface JobDeliveryOptions {
  /** Dedupe key. Enqueuing the same logical work twice is a no-op at the queue. */
  idempotencyKey: string
  /** Retry budget before the job is retired as dead. Defaults to DEFAULT_MAX_ATTEMPTS. */
  maxAttempts?: number
}

/** A job message plus the delivery metadata the queue stores, which is what enqueue accepts. */
export type JobEnvelope = JobMessage & {
  idempotencyKey: string
  maxAttempts: number
}

/**
 * Build a validated envelope. The payload is checked against its type's schema here, at the one
 * place envelopes are made, rather than failing later inside a handler that assumed it was valid.
 *
 * @throws {ValidationError} when the payload does not satisfy the schema for this type.
 */
export function buildJob<T extends JobTypeName>(
  type: T,
  payload: JobPayload<T>,
  options: JobDeliveryOptions
): JobEnvelope {
  const parsed = JOB_PAYLOAD_SCHEMAS[type].safeParse(payload)
  if (!parsed.success) {
    throw new ValidationError(`Invalid payload for job "${type}"`, { cause: parsed.error })
  }
  return {
    type,
    payload: parsed.data,
    idempotencyKey: options.idempotencyKey,
    maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
  } as JobEnvelope
}
