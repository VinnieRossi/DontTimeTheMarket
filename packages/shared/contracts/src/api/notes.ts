import { NoteSelectSchema } from '@dttm/database'
import {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  NoteIdSchema,
  UpdateNoteInputSchema,
} from '@dttm/validation'
import { oc } from '@orpc/contract'
import { z } from 'zod'

/**
 * The note routes. Inputs come from the validation package and the output is the schema the
 * database generates, so the API surface, the stored model, and the forms that feed it all
 * trace back to one definition instead of three that drift.
 */

/** What a caller receives. Derived from the generated row schema rather than described again. */
export const NoteSchema = NoteSelectSchema
export type Note = z.infer<typeof NoteSchema>

export const ListNotesOutputSchema = z.object({
  notes: z.array(NoteSchema),
  /** Null when there is no further page, so a caller never has to guess at the end. */
  nextCursor: z.string().min(1).nullable(),
})
export type ListNotesOutput = z.infer<typeof ListNotesOutputSchema>

export const listNotes = oc
  .route({ method: 'GET', path: '/notes', summary: 'List notes' })
  .input(ListNotesInputSchema)
  .output(ListNotesOutputSchema)

export const GetNoteInputSchema = z.object({ id: NoteIdSchema })
export type GetNoteInput = z.infer<typeof GetNoteInputSchema>

export const getNote = oc
  .route({ method: 'GET', path: '/notes/{id}', summary: 'Get a note' })
  .errors({ NOT_FOUND: { message: 'Note not found' } })
  .input(GetNoteInputSchema)
  .output(NoteSchema)

export const createNote = oc
  .route({ method: 'POST', path: '/notes', summary: 'Create a note' })
  .errors({
    CONFLICT: { message: 'A note with that title already exists' },
    FORBIDDEN: { message: 'Not allowed to create a note' },
  })
  .input(CreateNoteInputSchema)
  .output(NoteSchema)

export const updateNote = oc
  .route({ method: 'PATCH', path: '/notes/{id}', summary: 'Update a note' })
  .errors({
    NOT_FOUND: { message: 'Note not found' },
    FORBIDDEN: { message: 'Not allowed to change this note' },
  })
  .input(UpdateNoteInputSchema)
  .output(NoteSchema)

export const notesContract = {
  list: listNotes,
  getById: getNote,
  create: createNote,
  update: updateNote,
}
