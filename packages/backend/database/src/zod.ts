import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { jobStatus, noteStatus, notes } from './schema'

/**
 * Validation schemas generated from the tables above. They are derived, not written, so a
 * column added or a type changed in `schema.ts` shows up here and in every consumer without
 * anyone editing a second description of the same data.
 */
export const NoteSelectSchema = createSelectSchema(notes)
export const NoteInsertSchema = createInsertSchema(notes)

/** The status enums as schemas, so an API contract and a form share the database's own set. */
export const NoteStatusSchema = z.enum(noteStatus.enumValues)
export const JobStatusSchema = z.enum(jobStatus.enumValues)

export type NoteSelect = z.infer<typeof NoteSelectSchema>
