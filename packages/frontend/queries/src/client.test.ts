import { ValidationError } from '@dttm/types'
import { afterEach, describe, expect, it } from 'vitest'
import { createApiClient, resolveApiUrl } from './client'

/**
 * The URL is resolved when the client is built rather than when a call is made, and these tests
 * exist because getting it wrong fails in a way that leaves nothing in a network log: the link
 * cannot be constructed, so no request is ever attempted and the screen simply reports an error.
 */
describe('resolveApiUrl', () => {
  const originalLocation = globalThis.location

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    })
  })

  function pretendBrowserAt(origin: string): void {
    Object.defineProperty(globalThis, 'location', {
      value: { origin },
      configurable: true,
      writable: true,
    })
  }

  it('resolves against the given origin', () => {
    expect(resolveApiUrl('https://app.example.com')).toBe('https://app.example.com/api/rpc')
  })

  it('resolves against the browser own origin when none is given', () => {
    pretendBrowserAt('http://localhost:3000')
    expect(resolveApiUrl(undefined)).toBe('http://localhost:3000/api/rpc')
  })

  it('treats an empty origin as none given, rather than building a relative address', () => {
    pretendBrowserAt('http://localhost:3000')
    expect(resolveApiUrl('')).toBe('http://localhost:3000/api/rpc')
  })

  it('honors a custom path', () => {
    expect(resolveApiUrl('https://app.example.com', '/rpc')).toBe('https://app.example.com/rpc')
  })

  it('refuses to build an address with no origin at all, and says what is missing', () => {
    Object.defineProperty(globalThis, 'location', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    expect(() => resolveApiUrl(undefined)).toThrow(ValidationError)
    expect(() => resolveApiUrl(undefined)).toThrow(/baseUrl/)
  })
})

describe('createApiClient', () => {
  it('exposes the contract shape, so a call site is checked against the contract', () => {
    const client = createApiClient({ baseUrl: 'http://localhost:3000' })

    expect(typeof client.health).toBe('function')
    expect(typeof client.notes.list).toBe('function')
    expect(typeof client.notes.getById).toBe('function')
    expect(typeof client.notes.create).toBe('function')
    expect(typeof client.notes.update).toBe('function')
  })

  it('can be built where there is no origin, because a client component renders on the server too', () => {
    const originalLocation = globalThis.location
    Object.defineProperty(globalThis, 'location', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    try {
      expect(() => createApiClient()).not.toThrow()
    } finally {
      Object.defineProperty(globalThis, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      })
    }
  })

  it('sends a real call to the resolved address, which is the thing a relative URL broke', async () => {
    const seen: string[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = ((input: Request | string | URL) => {
      seen.push(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
      return Promise.resolve(
        new Response(JSON.stringify({ json: { status: 'ok', uptimeSeconds: 1 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }) as typeof globalThis.fetch

    try {
      const client = createApiClient({ baseUrl: 'https://app.example.com' })
      await client.health()
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(seen[0]).toContain('https://app.example.com/api/rpc')
  })

  it('accepts an injected transport, which is what keeps a test off the network', async () => {
    const client = createApiClient({
      link: { call: () => Promise.resolve({ status: 'ok', uptimeSeconds: 1 }) },
    })

    await expect(client.health()).resolves.toEqual({ status: 'ok', uptimeSeconds: 1 })
  })
})
