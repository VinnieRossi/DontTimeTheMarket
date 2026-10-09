import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { closeDatabase, createInMemoryDatabase, createPersistentDatabase } from './runtime'
import { alerts, jobs, notes } from './schema'

/**
 * These tests are the proof that the committed migrations apply to an empty database and that
 * the constraints the domain depends on are really enforced by Postgres rather than only by the
 * service layer. They run in-process, so they need no server and no credentials.
 */
describe('in-process database', () => {
  it('applies every committed migration to a clean database', async () => {
    const db = await createInMemoryDatabase()
    const tables = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`
    )
    const names = tables.rows.map((row) => row.table_name)
    expect(names).toContain('notes')
    expect(names).toContain('jobs')
    expect(names).toContain('alerts')
  })

  it('hands out an isolated database per call, so tests cannot see each other', async () => {
    const first = await createInMemoryDatabase()
    const second = await createInMemoryDatabase()
    await first.insert(notes).values({ id: 'n_1', title: 'First', body: 'b', authorId: 'u_1' })

    expect(await first.select().from(notes)).toHaveLength(1)
    expect(await second.select().from(notes)).toHaveLength(0)
  })

  it('applies the column defaults the schema declares', async () => {
    const db = await createInMemoryDatabase()
    const [row] = await db
      .insert(notes)
      .values({ id: 'n_1', title: 'Defaults', body: 'b', authorId: 'u_1' })
      .returning()

    expect(row?.status).toBe('draft')
    expect(row?.createdAt).toBeInstanceOf(Date)
  })

  it('rejects a second note with the same title for the same author', async () => {
    const db = await createInMemoryDatabase()
    await db.insert(notes).values({ id: 'n_1', title: 'Same', body: 'b', authorId: 'u_1' })

    await expect(
      db.insert(notes).values({ id: 'n_2', title: 'Same', body: 'c', authorId: 'u_1' })
    ).rejects.toThrow()
  })

  it('allows the same title for a different author', async () => {
    const db = await createInMemoryDatabase()
    await db.insert(notes).values({ id: 'n_1', title: 'Same', body: 'b', authorId: 'u_1' })
    await db.insert(notes).values({ id: 'n_2', title: 'Same', body: 'c', authorId: 'u_2' })

    expect(await db.select().from(notes)).toHaveLength(2)
  })

  it('rejects a second job with the same idempotency key', async () => {
    const db = await createInMemoryDatabase()
    await db
      .insert(jobs)
      .values({ id: 'j_1', type: 'note_created', payload: '{}', idempotencyKey: 'k1' })

    await expect(
      db
        .insert(jobs)
        .values({ id: 'j_2', type: 'note_created', payload: '{}', idempotencyKey: 'k1' })
    ).rejects.toThrow()
  })

  it('rejects a status outside the enum', async () => {
    const db = await createInMemoryDatabase()
    await expect(
      db.execute(
        sql`insert into notes (id, title, body, status, author_id) values ('n_9', 't', 'b', 'nonsense', 'u_1')`
      )
    ).rejects.toThrow()
  })

  it('stores an alert with its generated timestamp', async () => {
    const db = await createInMemoryDatabase()
    const [row] = await db
      .insert(alerts)
      .values({ id: 'a_1', level: 'error', title: 'Job dead-lettered', detail: 'out of retries' })
      .returning()

    expect(row?.createdAt).toBeInstanceOf(Date)
  })
})

describe('persistent database', () => {
  it('creates the directory path it was given, so a fresh clone needs no setup step', async () => {
    const location = join(mkdtempSync(join(tmpdir(), 'app-db-')), 'nested', 'app-db')
    const db = await createPersistentDatabase(location)

    await db.insert(notes).values({ id: 'n_1', title: 'Kept', body: 'b', authorId: 'u_1' })
    expect(await db.select().from(notes)).toHaveLength(1)
  })

  it('keeps its rows across handles, which is what makes it the persistent one', async () => {
    const location = join(mkdtempSync(join(tmpdir(), 'app-db-')), 'app-db')
    const first = await createPersistentDatabase(location)
    await first.insert(notes).values({ id: 'n_1', title: 'Kept', body: 'b', authorId: 'u_1' })
    await closeDatabase(first)

    const second = await createPersistentDatabase(location)
    expect(await second.select().from(notes)).toHaveLength(1)
  })
})
