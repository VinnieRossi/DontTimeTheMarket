import { type Database, type NoteRow, type NoteStatus, notes } from '@dttm/database'
import { and, desc, eq, lt, or } from 'drizzle-orm'

/**
 * Every statement that touches the notes table lives here. Keeping the SQL in one module means a
 * service reads as the rules it enforces, and a schema change has one place to land rather than
 * being scattered across whichever functions happened to query directly.
 */

export interface InsertNoteRow {
  id: string
  title: string
  body: string
  status: NoteStatus
  authorId: string
  at: Date
}

export async function insertNote(db: Database, row: InsertNoteRow): Promise<NoteRow> {
  const [inserted] = await db
    .insert(notes)
    .values({
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status,
      authorId: row.authorId,
      createdAt: row.at,
      updatedAt: row.at,
    })
    .returning()
  if (inserted === undefined) throw new Error('the insert returned no row')
  return inserted
}

export async function findNoteById(db: Database, id: string): Promise<NoteRow | undefined> {
  const [row] = await db.select().from(notes).where(eq(notes.id, id)).limit(1)
  return row
}

export async function findNoteByTitle(
  db: Database,
  authorId: string,
  title: string
): Promise<NoteRow | undefined> {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.authorId, authorId), eq(notes.title, title)))
    .limit(1)
  return row
}

export interface ListNotesQuery {
  /** Who is asking. A draft is returned only to its author, a published note to anyone. */
  viewerId: string
  status?: NoteStatus
  limit: number
  /** The `createdAt` and `id` of the last row of the previous page, for a stable cursor. */
  after?: { createdAt: Date; id: string }
}

/**
 * Newest first, one row further than asked for, so the caller can tell whether another page
 * exists without a second count query. The cursor compares on the created time and breaks ties on
 * the id, because two notes written in the same millisecond would otherwise make a page boundary
 * skip or repeat a row.
 */
export async function listNotes(db: Database, query: ListNotesQuery): Promise<NoteRow[]> {
  const conditions = [or(eq(notes.status, 'published'), eq(notes.authorId, query.viewerId))]
  if (query.status !== undefined) conditions.push(eq(notes.status, query.status))
  if (query.after !== undefined) {
    conditions.push(
      or(
        lt(notes.createdAt, query.after.createdAt),
        and(eq(notes.createdAt, query.after.createdAt), lt(notes.id, query.after.id))
      )
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined
  return db
    .select()
    .from(notes)
    .where(where)
    .orderBy(desc(notes.createdAt), desc(notes.id))
    .limit(query.limit + 1)
}

export interface UpdateNoteRow {
  id: string
  title?: string
  body?: string
  status?: NoteStatus
  at: Date
}

export async function updateNote(db: Database, row: UpdateNoteRow): Promise<NoteRow | undefined> {
  const [updated] = await db
    .update(notes)
    .set({
      ...(row.title !== undefined ? { title: row.title } : {}),
      ...(row.body !== undefined ? { body: row.body } : {}),
      ...(row.status !== undefined ? { status: row.status } : {}),
      updatedAt: row.at,
    })
    .where(eq(notes.id, row.id))
    .returning()
  return updated
}
