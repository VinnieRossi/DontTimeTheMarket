import { ValidationError } from '@dttm/types'
import { describe, expect, it } from 'vitest'
import { buildJob, DEFAULT_MAX_ATTEMPTS, JOB_PAYLOAD_SCHEMAS, JOB_TYPES, JobType } from './job'

describe('buildJob', () => {
  it('builds an envelope carrying the type, the payload, and the delivery metadata', () => {
    const job = buildJob(
      JobType.NoteCreated,
      { noteId: 'n_1', authorId: 'u_1' },
      { idempotencyKey: 'note_created:n_1' }
    )

    expect(job).toEqual({
      type: 'note_created',
      payload: { noteId: 'n_1', authorId: 'u_1' },
      idempotencyKey: 'note_created:n_1',
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    })
  })

  it('honors an explicit retry budget', () => {
    const job = buildJob(
      'note_created',
      { noteId: 'n_1', authorId: 'u_1' },
      { idempotencyKey: 'k', maxAttempts: 2 }
    )
    expect(job.maxAttempts).toBe(2)
  })

  it('rejects a payload that does not match its type, at the one place envelopes are made', () => {
    const attempt = () =>
      buildJob(
        'note_created',
        { noteId: '', authorId: 'u_1' },
        { idempotencyKey: 'note_created:n_1' }
      )
    expect(attempt).toThrow(ValidationError)
    expect(attempt).toThrow(/note_created/)
  })

  it('has a payload schema for every declared job type', () => {
    for (const type of JOB_TYPES) {
      expect(JOB_PAYLOAD_SCHEMAS[type]).toBeDefined()
    }
  })
})
