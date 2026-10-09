import type { QueueProvider } from '@dttm/contracts'
import {
  ConflictError,
  ExternalServiceError,
  err,
  ForbiddenError,
  NotFoundError,
} from '@dttm/types'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestWorld, TEST_NOW, type TestWorld } from '../test-support'
import { createNote, getNote, listNotes, updateNote } from './note-service'

let world: TestWorld

beforeEach(async () => {
  world = await createTestWorld()
})

describe('createNote', () => {
  it('records the note with the caller as its author and the injected clock as its time', async () => {
    const note = await createNote({ title: 'First', body: 'A body' }, world.service)

    expect(note).toMatchObject({
      id: 'note_1',
      title: 'First',
      body: 'A body',
      status: 'draft',
      authorId: 'u_author',
      createdAt: TEST_NOW,
    })
  })

  it('honors an explicit status', async () => {
    const note = await createNote(
      { title: 'Published', body: 'b', status: 'published' },
      world.service
    )
    expect(note.status).toBe('published')
  })

  it('refuses a member who creates a note already published, the same rule an update enforces', async () => {
    world.actAs({ userId: 'u_member', role: 'member' })

    await expect(
      createNote({ title: 'Sneaky', body: 'b', status: 'published' }, world.service)
    ).rejects.toThrow('Not allowed to publish this note')

    await expect(listNotes({}, world.service)).resolves.toMatchObject({ notes: [] })
    await expect(createNote({ title: 'Fine', body: 'b' }, world.service)).resolves.toMatchObject({
      status: 'draft',
    })
  })

  it('enqueues the follow-up work rather than doing it inline', async () => {
    const note = await createNote({ title: 'First', body: 'b' }, world.service)

    // Nothing has been sent yet: the pipeline owns that, and it has not run.
    expect(world.mail.sent).toHaveLength(0)

    const claimed = await world.queue.claimDue({
      now: TEST_NOW,
      limit: 10,
      lockToken: 'test',
      leaseSeconds: 60,
    })
    if (claimed.ok) {
      expect(claimed.value).toHaveLength(1)
      expect(claimed.value[0]?.type).toBe('note_created')
      expect(claimed.value[0]?.payload).toEqual({ noteId: note.id, authorId: 'u_author' })
      expect(claimed.value[0]?.idempotencyKey).toBe(`note_created:${note.id}`)
    }
  })

  it('refuses a caller whose role cannot create, without writing anything', async () => {
    world.actAs({ userId: 'u_guest', role: 'guest' })
    await expect(createNote({ title: 'First', body: 'b' }, world.service)).rejects.toThrow(
      ForbiddenError
    )

    world.actAs({ userId: 'u_author', role: 'editor' })
    await expect(listNotes({}, world.service)).resolves.toMatchObject({ notes: [] })
  })

  it('refuses a second note with the same title from the same author', async () => {
    await createNote({ title: 'Same', body: 'b' }, world.service)

    await expect(createNote({ title: 'Same', body: 'c' }, world.service)).rejects.toThrow(
      ConflictError
    )
  })

  it('allows the same title from a different author', async () => {
    await createNote({ title: 'Same', body: 'b' }, world.service)
    world.actAs({ userId: 'u_other', role: 'editor' })

    await expect(createNote({ title: 'Same', body: 'c' }, world.service)).resolves.toMatchObject({
      title: 'Same',
      authorId: 'u_other',
    })
  })

  it('keeps the note when the follow-up work cannot be enqueued, and says so loudly', async () => {
    const queue: QueueProvider = {
      ...world.queue,
      claimDue: (input) => world.queue.claimDue(input),
      complete: (input) => world.queue.complete(input),
      fail: (input) => world.queue.fail(input),
      reclaimExpired: (input) => world.queue.reclaimExpired(input),
      listDead: (input) => world.queue.listDead(input),
      enqueue: () => Promise.resolve(err(new ExternalServiceError('queue', 'the queue is down'))),
    }

    const note = await createNote({ title: 'First', body: 'b' }, { ...world.service, queue })

    expect(note.id).toBe('note_1')
    expect(
      world.logs.some(
        (record) => record.level === 'error' && record.message.includes('could not be enqueued')
      )
    ).toBe(true)
  })
})

describe('getNote', () => {
  it('returns the note', async () => {
    const created = await createNote({ title: 'First', body: 'b' }, world.service)
    await expect(getNote(created.id, world.service)).resolves.toMatchObject({ id: created.id })
  })

  it('reports a missing note as not found, naming what was asked for', async () => {
    await expect(getNote('note_missing', world.service)).rejects.toThrow(
      'Note not found: note_missing'
    )
  })

  it('refuses a caller with no account', async () => {
    const guestWorld = await createTestWorld({ userId: 'u_1', role: 'guest' })
    await expect(getNote('note_1', guestWorld.service)).rejects.toThrow(ForbiddenError)
  })

  it('keeps a draft private, reporting it as missing to another member', async () => {
    const draft = await createNote({ title: 'Private', body: 'b' }, world.service)

    world.actAs({ userId: 'u_other', role: 'member' })
    await expect(getNote(draft.id, world.service)).rejects.toThrow(NotFoundError)

    world.actAs({ userId: 'u_admin', role: 'admin' })
    await expect(getNote(draft.id, world.service)).rejects.toThrow(NotFoundError)

    world.actAs({ userId: 'u_author', role: 'editor' })
    await expect(getNote(draft.id, world.service)).resolves.toMatchObject({ id: draft.id })
  })

  it('shows a published note to another member', async () => {
    const published = await createNote(
      { title: 'Public', body: 'b', status: 'published' },
      world.service
    )

    world.actAs({ userId: 'u_other', role: 'member' })
    await expect(getNote(published.id, world.service)).resolves.toMatchObject({
      id: published.id,
    })
  })
})

describe('listNotes', () => {
  beforeEach(async () => {
    for (const title of ['One', 'Two', 'Three']) {
      await createNote({ title, body: 'b' }, world.service)
      world.clock.advance(60)
    }
  })

  it('returns the newest first', async () => {
    const result = await listNotes({}, world.service)
    expect(result.notes.map((note) => note.title)).toEqual(['Three', 'Two', 'One'])
  })

  it('filters by status', async () => {
    await createNote({ title: 'Live', body: 'b', status: 'published' }, world.service)

    const result = await listNotes({ status: 'published' }, world.service)
    expect(result.notes.map((note) => note.title)).toEqual(['Live'])
  })

  it('reports no cursor when the last page is the only page', async () => {
    const result = await listNotes({ limit: 10 }, world.service)
    expect(result.nextCursor).toBe(null)
  })

  it('pages forward without repeating or skipping a row', async () => {
    const first = await listNotes({ limit: 2 }, world.service)
    expect(first.notes.map((note) => note.title)).toEqual(['Three', 'Two'])
    expect(first.nextCursor).not.toBe(null)

    const cursor = first.nextCursor
    if (cursor === null) throw new Error('expected a cursor')
    const second = await listNotes({ limit: 2, cursor }, world.service)
    expect(second.notes.map((note) => note.title)).toEqual(['One'])
    expect(second.nextCursor).toBe(null)
  })

  it('ignores a cursor it cannot read rather than failing the request', async () => {
    const result = await listNotes({ limit: 10, cursor: 'not-a-cursor' }, world.service)
    expect(result.notes).toHaveLength(3)
  })

  it('refuses a caller with no account', async () => {
    const guestWorld = await createTestWorld({ userId: 'u_1', role: 'guest' })
    await expect(listNotes({}, guestWorld.service)).rejects.toThrow(ForbiddenError)
  })

  it('lists only published notes and their own drafts for another member', async () => {
    await createNote({ title: 'Public', body: 'b', status: 'published' }, world.service)

    world.actAs({ userId: 'u_other', role: 'member' })
    await createNote({ title: 'Mine', body: 'b' }, world.service)

    const everything = await listNotes({}, world.service)
    expect(everything.notes.map((note) => note.title).sort()).toEqual(['Mine', 'Public'])

    const drafts = await listNotes({ status: 'draft' }, world.service)
    expect(drafts.notes.map((note) => note.title)).toEqual(['Mine'])
  })
})

describe('updateNote', () => {
  it('lets an author change their own note', async () => {
    const note = await createNote({ title: 'First', body: 'b' }, world.service)
    world.clock.advance(300)

    const updated = await updateNote({ id: note.id, body: 'changed' }, world.service)
    expect(updated.body).toBe('changed')
    expect(updated.updatedAt.getTime()).toBe(TEST_NOW.getTime() + 300_000)
  })

  it('refuses a caller who is neither the author nor an admin', async () => {
    const note = await createNote({ title: 'First', body: 'b', status: 'published' }, world.service)
    world.actAs({ userId: 'u_other', role: 'member' })

    await expect(updateNote({ id: note.id, body: 'changed' }, world.service)).rejects.toThrow(
      ForbiddenError
    )
  })

  it('lets an admin change a published note they did not write', async () => {
    const note = await createNote({ title: 'First', body: 'b', status: 'published' }, world.service)
    world.actAs({ userId: 'u_admin', role: 'admin' })

    await expect(
      updateNote({ id: note.id, body: 'changed' }, world.service)
    ).resolves.toMatchObject({ body: 'changed' })
  })

  it('refuses to publish for a caller whose role cannot publish', async () => {
    const memberWorld = await createTestWorld({ userId: 'u_member', role: 'member' })
    const note = await createNote({ title: 'First', body: 'b' }, memberWorld.service)

    await expect(
      updateNote({ id: note.id, status: 'published' }, memberWorld.service)
    ).rejects.toThrow('Not allowed to publish this note')
  })

  it('reports another author draft as missing rather than letting anyone change it', async () => {
    const note = await createNote({ title: 'First', body: 'b' }, world.service)

    world.actAs({ userId: 'u_admin', role: 'admin' })
    await expect(updateNote({ id: note.id, body: 'changed' }, world.service)).rejects.toThrow(
      NotFoundError
    )
  })

  it('refuses a rename onto a title the author already used', async () => {
    await createNote({ title: 'Taken', body: 'b' }, world.service)
    const note = await createNote({ title: 'Free', body: 'b' }, world.service)

    await expect(updateNote({ id: note.id, title: 'Taken' }, world.service)).rejects.toThrow(
      ConflictError
    )
  })

  it('allows a rename to the title the note already has', async () => {
    const note = await createNote({ title: 'Same', body: 'b' }, world.service)

    await expect(
      updateNote({ id: note.id, title: 'Same', body: 'changed' }, world.service)
    ).resolves.toMatchObject({ title: 'Same', body: 'changed' })
  })

  it('reports a missing note as not found', async () => {
    await expect(updateNote({ id: 'note_missing', body: 'x' }, world.service)).rejects.toThrow(
      NotFoundError
    )
  })
})
