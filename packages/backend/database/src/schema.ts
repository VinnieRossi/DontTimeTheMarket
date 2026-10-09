import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

/**
 * The single authoritative definition of the data model. Every type downstream is derived from
 * this file, so nothing restates a column or an enum member, and a schema change shows up as a
 * type error at every call site that needs updating.
 *
 * The example domain is deliberately one table plus the pipeline's outbox. Replace `notes`
 * with the real domain; keep `jobs`, because the durable pipeline is what stops work being
 * dropped silently.
 */

export const noteStatus = pgEnum('note_status', ['draft', 'published', 'archived'])

export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: noteStatus('status').notNull().default('draft'),
    authorId: text('author_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One note per title per author: the rule the service enforces, also held by the database
    // so a race between two concurrent creates cannot get past it.
    uniqueIndex('notes_author_title_key').on(table.authorId, table.title),
    index('notes_status_created_at_idx').on(table.status, table.createdAt),
  ]
)

export const jobStatus = pgEnum('job_status', ['queued', 'claimed', 'done', 'dead'])

export const jobs = pgTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    status: jobStatus('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    /** Enqueuing the same logical work twice is a no-op, enforced by this unique column. */
    idempotencyKey: text('idempotency_key').notNull().unique(),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
    /** Set while a worker holds the job; proves ownership when it completes or fails it. */
    lockToken: text('lock_token'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('jobs_status_run_at_idx').on(table.status, table.runAt)]
)

export const alerts = pgTable('alerts', {
  id: text('id').primaryKey(),
  level: text('level').notNull(),
  title: text('title').notNull(),
  detail: text('detail').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Row types, derived from the tables above rather than written a second time. */
export type NoteRow = typeof notes.$inferSelect
export type NewNoteRow = typeof notes.$inferInsert
export type JobRow = typeof jobs.$inferSelect
export type NewJobRow = typeof jobs.$inferInsert
export type AlertRow = typeof alerts.$inferSelect
export type NewAlertRow = typeof alerts.$inferInsert

/** The status literals, derived from the enum so no layer restates them. */
export type NoteStatus = (typeof noteStatus.enumValues)[number]
export type JobStatus = (typeof jobStatus.enumValues)[number]
export const NOTE_STATUSES = noteStatus.enumValues
export const JOB_STATUSES = jobStatus.enumValues
