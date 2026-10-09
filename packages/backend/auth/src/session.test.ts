import { UnauthorizedError } from '@dttm/types'
import { describe, expect, it } from 'vitest'
import { requireSession, StaticSessionReader } from './session'

describe('StaticSessionReader', () => {
  it('reports the session it was constructed with', async () => {
    const reader = new StaticSessionReader({ userId: 'u_1', role: 'member' })
    await expect(reader.current()).resolves.toEqual({ userId: 'u_1', role: 'member' })
  })

  it('reports no session when there is none', async () => {
    await expect(new StaticSessionReader(null).current()).resolves.toBe(null)
  })

  it('can switch caller, so one test can drive two roles through the same path', async () => {
    const reader = new StaticSessionReader({ userId: 'u_1', role: 'member' })
    reader.setSession({ userId: 'u_2', role: 'admin' })
    await expect(reader.current()).resolves.toEqual({ userId: 'u_2', role: 'admin' })
  })
})

describe('requireSession', () => {
  it('returns the session when there is one', async () => {
    const reader = new StaticSessionReader({ userId: 'u_1', role: 'editor' })
    await expect(requireSession(reader)).resolves.toEqual({ userId: 'u_1', role: 'editor' })
  })

  it('raises one typed refusal when there is none, rather than a null every caller must check', async () => {
    await expect(requireSession(new StaticSessionReader(null))).rejects.toThrow(UnauthorizedError)
  })
})
