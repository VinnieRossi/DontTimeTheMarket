import { createApiClient } from '@dttm/queries'
import { RPCLink } from '@orpc/client/fetch'
import { RPCHandler } from '@orpc/server/fetch'
import { beforeAll, describe, expect, it } from 'vitest'
import { apiRouter } from './api-router'
import { drainJobs } from './job-runner'

/**
 * The transport, exercised as a black box: a real request goes through the real handler, into the
 * real services, against the real in-process database, and the assertions are about what a client
 * receives. This is the seam the unit tests cannot reach, and where a handler that forgot to
 * translate an error or a contract that drifted from its implementation actually shows up.
 *
 * It needs no server and no credentials. The client's transport is pointed at the handler in this
 * process rather than at a socket.
 */
const handler = new RPCHandler(apiRouter)

/** A link that dispatches straight into the handler, so the whole round trip stays in-process. */
const inProcessLink = new RPCLink({
  url: 'http://localhost/api/rpc',
  fetch: async (request) => {
    const result = await handler.handle(new Request(request), { prefix: '/api/rpc' })
    return result.matched ? result.response : new Response('Not Found', { status: 404 })
  },
})

const client = createApiClient({ baseUrl: 'http://localhost', link: inProcessLink })

let titleCounter = 0

/** A distinct title per test, because the database persists across this file's tests. */
function uniqueTitle(prefix: string): string {
  titleCounter += 1
  return `${prefix} ${Date.now()}-${titleCounter}`
}

describe('the API over its real transport', () => {
  beforeAll(async () => {
    // Prove the wiring answers at all before any test blames a handler for a broken container.
    await expect(client.health()).resolves.toMatchObject({ status: 'ok' })
  })

  it('reports liveness with an uptime a caller can read', async () => {
    const health = await client.health()
    expect(health.status).toBe('ok')
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  it('reports mail as mocked, which is what the test environment runs', async () => {
    const health = await client.health()
    expect(health.mockedProviders).toEqual(['mail'])
  })

  it('creates a note and returns it in the shape the contract declares', async () => {
    const title = uniqueTitle('Created through the transport')
    const note = await client.notes.create({ title, body: 'A body' })

    expect(note).toMatchObject({ title, body: 'A body', status: 'draft', authorId: 'u_local' })
    expect(note.id).toMatch(/^note_/)
    expect(note.createdAt).toBeInstanceOf(Date)
  })

  it('returns a created note through the list route', async () => {
    const title = uniqueTitle('Listed through the transport')
    await client.notes.create({ title, body: 'A body' })

    const page = await client.notes.list({ limit: 100 })
    expect(page.notes.some((note) => note.title === title)).toBe(true)
  })

  it('addresses a single note by id', async () => {
    const created = await client.notes.create({
      title: uniqueTitle('Fetched by id'),
      body: 'A body',
    })

    const fetched = await client.notes.getById({ id: created.id })
    expect(fetched.id).toBe(created.id)
  })

  it('reports a missing note as not found rather than as a server failure', async () => {
    await expect(client.notes.getById({ id: 'note_definitely_missing' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('reports a duplicate title as a conflict, translating the domain error', async () => {
    const title = uniqueTitle('Duplicated')
    await client.notes.create({ title, body: 'A body' })

    await expect(client.notes.create({ title, body: 'Another body' })).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })

  it('rejects input the schema refuses, before any service sees it', async () => {
    await expect(client.notes.create({ title: '', body: 'A body' })).rejects.toBeDefined()
  })

  it('updates a note and reports the new state', async () => {
    const created = await client.notes.create({
      title: uniqueTitle('To be published'),
      body: 'A body',
    })

    const updated = await client.notes.update({ id: created.id, status: 'published' })
    expect(updated.status).toBe('published')
  })

  it('never returns a raw internal detail in an error, only a code and a message', async () => {
    try {
      await client.notes.getById({ id: 'note_definitely_missing' })
      throw new Error('expected the request to fail')
    } catch (error) {
      const serialized = JSON.stringify(error)
      expect(serialized).not.toContain('select')
      expect(serialized).not.toContain('node_modules')
    }
  })
})

describe('the pipeline behind the transport', () => {
  it('runs the work a creation enqueued, once', async () => {
    await client.notes.create({ title: uniqueTitle('Drained'), body: 'A body' })

    const first = await drainJobs()
    if (!first.ok) throw first.error
    expect(first.value.summary.claimed).toBeGreaterThanOrEqual(1)
    expect(first.value.summary.completed).toBe(first.value.summary.claimed)

    const second = await drainJobs()
    if (!second.ok) throw second.error
    expect(second.value.summary.claimed).toBe(0)
  })
})

describe('the limits the transport applies', () => {
  it('refuses a caller that has used up its allowance, and says to come back later', async () => {
    // The write allowance is the tighter of the two, so it is the one a test can reach.
    const attempts = Array.from({ length: 40 }, (_, index) =>
      client.notes.create({ title: uniqueTitle(`Flood ${index}`), body: 'A body' })
    )
    const outcomes = await Promise.allSettled(attempts)

    const refused = outcomes.filter(
      (outcome) =>
        outcome.status === 'rejected' &&
        (outcome.reason as { code?: string }).code === 'TOO_MANY_REQUESTS'
    )
    expect(refused.length).toBeGreaterThan(0)

    const first = refused[0]
    const data =
      first?.status === 'rejected' ? (first.reason as { data?: unknown }).data : undefined
    expect(data).toEqual({ retryAfterSeconds: expect.any(Number) })
    expect((data as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThan(0)
  })
})
