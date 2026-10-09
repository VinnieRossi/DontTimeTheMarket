import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApiClient } from '@dttm/queries'
import { RPCLink } from '@orpc/client/fetch'
import { RPCHandler } from '@orpc/server/fetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Live mode refuses to boot until a real session reader and real adapters are wired. The refusal
 * has to be readable by whoever operates the deployment, so this drives a request against a
 * container that cannot build and asserts on what reaches the log and what the client is told.
 *
 * The container is built once per process, so each test loads a fresh copy of the router.
 */
describe('a request when the container refuses to boot', () => {
  let directory: string

  beforeEach(() => {
    vi.resetModules()
    // The container opens its database before it refuses, so this test needs a directory of its
    // own: two processes opening the one the other tests use would corrupt it.
    directory = mkdtempSync(join(tmpdir(), 'app-web-boot-test-db-'))
    vi.stubEnv('DATABASE_DIR', directory)
    vi.stubEnv('PROVIDER_MODE', 'live')
    vi.stubEnv('PIPELINE_SECRET', 'a-shared-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    rmSync(directory, { recursive: true, force: true })
  })

  it('logs why boot was refused and tells the client only that the server failed', async () => {
    const lines: string[] = []
    vi.spyOn(console, 'error').mockImplementation((line: unknown) => {
      lines.push(String(line))
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { apiRouter } = await import('./api-router')
    const handler = new RPCHandler(apiRouter)
    const client = createApiClient({
      baseUrl: 'http://localhost',
      link: new RPCLink({
        url: 'http://localhost/api/rpc',
        fetch: async (request) => {
          const result = await handler.handle(new Request(request), { prefix: '/api/rpc' })
          return result.matched ? result.response : new Response('Not Found', { status: 404 })
        },
      }),
    })

    await expect(client.notes.list({ limit: 10 })).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    })

    const logged = lines.map((line) => JSON.parse(line) as { message: string; fields?: unknown })
    const refusal = logged.find((line) => line.message === 'server container failed to build')
    expect(JSON.stringify(refusal?.fields)).toMatch(/mail adapter|session reader/i)
  })
})
