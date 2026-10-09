import { canCreateNote, canPublishNote, canViewNotes, notePermissionsFor } from '@dttm/auth'
import { buildJob, type Note } from '@dttm/contracts'
import type { NoteStatus } from '@dttm/database'
import { ConflictError, ForbiddenError, NotFoundError } from '@dttm/types'
import type { CreateNoteInput, ListNotesInput, UpdateNoteInput } from '@dttm/validation'
import { DEFAULT_PAGE_SIZE } from '@dttm/validation'
import type { ServiceContext } from '../context'
import {
  findNoteById,
  findNoteByTitle,
  insertNote,
  listNotes as listNoteRows,
  updateNote as updateNoteRow,
} from './note-repository'

/**
 * The note domain. This is where the rules live: who may act, what makes an action invalid, and
 * what else has to happen when one succeeds. The transport layer above calls these and translates
 * their errors; it decides nothing.
 *
 * Every function takes its context rather than reaching for a database or a provider, so the same
 * code runs in a test against an in-process database and in the app against a real one.
 *
 * Errors are thrown rather than returned here, because each one means the operation cannot proceed
 * at all and a caller that forgot to check a returned error would carry on as though it had.
 */

export interface ListNotesResult {
  notes: Note[]
  nextCursor: string | null
}

export async function listNotes(
  input: ListNotesInput,
  context: ServiceContext
): Promise<ListNotesResult> {
  if (!canViewNotes(context.session.role)) {
    throw new ForbiddenError('Not allowed to read notes')
  }

  const limit = input.limit ?? DEFAULT_PAGE_SIZE
  const after = input.cursor !== undefined ? decodeCursor(input.cursor) : undefined
  const rows = await listNoteRows(context.db, {
    viewerId: context.session.userId,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(after !== undefined ? { after } : {}),
    limit,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page.at(-1)
  return {
    notes: page,
    nextCursor: hasMore && last !== undefined ? encodeCursor(last) : null,
  }
}

export async function getNote(id: string, context: ServiceContext): Promise<Note> {
  if (!canViewNotes(context.session.role)) {
    throw new ForbiddenError('Not allowed to read notes')
  }
  const note = await findNoteById(context.db, id)
  if (note === undefined || !canViewNote(note, context)) throw new NotFoundError('Note', id)
  return note
}

/**
 * A draft someone else wrote is reported as missing rather than forbidden, so the answer does not
 * confirm that it exists.
 */
function canViewNote(note: Note, context: ServiceContext): boolean {
  const { session } = context
  return notePermissionsFor(session.role, toOwnership(note), session.userId).canView
}

function toOwnership(note: Note): { authorId: string; isPublished: boolean } {
  return { authorId: note.authorId, isPublished: note.status === 'published' }
}

/**
 * Create a note and enqueue the work that follows from it. The job is enqueued rather than done
 * here, so a slow or failing side effect cannot fail the creation the caller asked for, and the
 * pipeline retries it until it succeeds or is dead-lettered with an alert.
 *
 * The idempotency key is derived from the note id, so a retry of this whole operation cannot
 * produce two notifications for one note.
 */
export async function createNote(input: CreateNoteInput, context: ServiceContext): Promise<Note> {
  const { session } = context
  if (!canCreateNote(session.role)) {
    throw new ForbiddenError('Not allowed to create a note')
  }

  const status: NoteStatus = input.status ?? 'draft'
  if (status === 'published' && !canPublishNote(session.role)) {
    throw new ForbiddenError('Not allowed to publish this note')
  }
  const existing = await findNoteByTitle(context.db, session.userId, input.title)
  if (existing !== undefined) {
    throw new ConflictError(`A note titled "${input.title}" already exists`)
  }

  const note = await insertNote(context.db, {
    id: context.ids.next('note'),
    title: input.title,
    body: input.body,
    status,
    authorId: session.userId,
    at: context.clock.now(),
  })

  const enqueued = await context.queue.enqueue(
    buildJob(
      'note_created',
      { noteId: note.id, authorId: note.authorId },
      { idempotencyKey: `note_created:${note.id}` }
    )
  )
  if (!enqueued.ok) {
    // The note exists and the follow-up work does not. Losing the notification is recoverable;
    // failing the creation the caller already succeeded at is not, so this is logged loudly and
    // the operation stands.
    context.logger.error('note created but its follow-up work could not be enqueued', {
      noteId: note.id,
      error: enqueued.error,
    })
  }

  return note
}

export async function updateNote(input: UpdateNoteInput, context: ServiceContext): Promise<Note> {
  const { session } = context
  const note = await findNoteById(context.db, input.id)
  if (note === undefined) throw new NotFoundError('Note', input.id)

  const permissions = notePermissionsFor(session.role, toOwnership(note), session.userId)
  if (!permissions.canView) throw new NotFoundError('Note', input.id)
  if (!permissions.canEdit) {
    throw new ForbiddenError('Not allowed to change this note')
  }
  if (input.status === 'published' && !permissions.canPublish) {
    throw new ForbiddenError('Not allowed to publish this note')
  }

  if (input.title !== undefined && input.title !== note.title) {
    const clash = await findNoteByTitle(context.db, note.authorId, input.title)
    if (clash !== undefined && clash.id !== note.id) {
      throw new ConflictError(`A note titled "${input.title}" already exists`)
    }
  }

  const updated = await updateNoteRow(context.db, {
    id: input.id,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    at: context.clock.now(),
  })
  if (updated === undefined) throw new NotFoundError('Note', input.id)
  return updated
}

/**
 * The cursor is opaque to the caller on purpose: it encodes the sort key, and a caller that
 * parsed it would be depending on the ordering rather than on the page it was handed.
 */
function encodeCursor(note: Note): string {
  return Buffer.from(`${note.createdAt.toISOString()}|${note.id}`, 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | undefined {
  const [timestamp, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
  if (timestamp === undefined || id === undefined) return undefined
  const createdAt = new Date(timestamp)
  return Number.isNaN(createdAt.getTime()) ? undefined : { createdAt, id }
}
