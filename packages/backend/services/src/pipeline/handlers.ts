import type { JobPayload, JobTypeName } from '@dttm/contracts'
import { AppError, err, NotFoundError, ok, type Result } from '@dttm/types'
import type { PipelineContext } from '../context'
import { findNoteById } from '../notes/note-repository'

/** A failure no later attempt can fix. Anything else a handler returns is retried. */
export class NonRetryableError extends AppError {
  readonly code = 'NON_RETRYABLE'
  readonly status = 500
}

/**
 * One handler per job type. The table is exhaustive by construction: a job type without a handler
 * is a compile error rather than a job that sits in the queue until someone notices.
 *
 * A handler returns a Result rather than throwing, because a failure here is an ordinary outcome
 * the engine has to act on, deciding between a retry and a dead letter. The engine also catches a
 * handler that throws anyway, so an unexpected exception travels the same path rather than
 * escaping the run.
 *
 * A failure is retried with backoff unless it is a `NonRetryableError`, and that one retires the
 * job with its alert on the first attempt.
 */
export type JobHandler<T extends JobTypeName> = (payload: JobPayload<T>) => Promise<Result<void>>

export type JobHandlers = {
  [K in JobTypeName]: JobHandler<K>
}

/**
 * Notify the author that their note was recorded. This is the example side effect: it goes through
 * the mail port, so in mock mode it lands in a list a test can read and in live mode it goes
 * wherever the configured adapter sends it.
 */
async function handleNoteCreated(
  payload: JobPayload<'note_created'>,
  context: PipelineContext
): Promise<Result<void>> {
  const note = await findNoteById(context.db, payload.noteId)
  if (note === undefined) {
    // The note was deleted between the enqueue and this attempt. Retrying cannot help, so this
    // fails permanently rather than burning the retry budget on work that can never succeed.
    return err(
      new NonRetryableError(`the note ${payload.noteId} no longer exists`, {
        cause: new NotFoundError('Note', payload.noteId),
      })
    )
  }

  const sent = await context.mail.send({
    to: `${payload.authorId}@example.invalid`,
    subject: `Your note "${note.title}" was saved`,
    text: `The note "${note.title}" is now ${note.status}.`,
  })
  if (!sent.ok) return sent

  context.logger.info('note-created notification sent', {
    noteId: note.id,
    messageId: sent.value.messageId,
  })
  return ok(undefined)
}

export function createJobHandlers(context: PipelineContext): JobHandlers {
  return {
    note_created: (payload) => handleNoteCreated(payload, context),
  }
}
