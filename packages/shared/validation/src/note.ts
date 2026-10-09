import { NoteStatusSchema } from '@dttm/database'
import { z } from 'zod'

/**
 * The input rules for the note domain, written once. The API boundary parses requests with
 * these and a form validates fields with the same objects, so the two cannot disagree about
 * what a valid title is. The status set comes from the database enum rather than a second list.
 */

export const TITLE_MAX = 120
export const BODY_MAX = 10_000

export const NoteIdSchema = z.string().min(1, 'A note id is required')

export const CreateNoteInputSchema = z.object({
  title: z.string().trim().min(1, 'A title is required').max(TITLE_MAX),
  body: z.string().trim().min(1, 'A body is required').max(BODY_MAX),
  status: NoteStatusSchema.optional(),
})
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>

export const UpdateNoteInputSchema = z
  .object({
    id: NoteIdSchema,
    title: z.string().trim().min(1).max(TITLE_MAX).optional(),
    body: z.string().trim().min(1).max(BODY_MAX).optional(),
    status: NoteStatusSchema.optional(),
  })
  .refine(
    (input) => input.title !== undefined || input.body !== undefined || input.status !== undefined,
    { message: 'An update has to change at least one field' }
  )
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>

export const MAX_PAGE_SIZE = 100
export const DEFAULT_PAGE_SIZE = 20

export const ListNotesInputSchema = z.object({
  status: NoteStatusSchema.optional(),
  limit: z.number().int().positive().max(MAX_PAGE_SIZE).optional(),
  /** Opaque forward cursor. The caller passes back whatever the previous page returned. */
  cursor: z.string().min(1).optional(),
})
export type ListNotesInput = z.infer<typeof ListNotesInputSchema>
