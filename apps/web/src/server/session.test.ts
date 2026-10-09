import { StaticSessionReader } from '@dttm/auth'
import { parseEnv } from '@dttm/env'
import { ProviderConfigError } from '@dttm/providers'
import { describe, expect, it } from 'vitest'
import { resolveSessionReader } from './session'

const SECRET = { PIPELINE_SECRET: 's3cret' }

describe('resolveSessionReader', () => {
  it('gives a fresh clone a local editor, so the app runs with no identity provider', async () => {
    const reader = resolveSessionReader(parseEnv({}))

    expect(reader).toBeInstanceOf(StaticSessionReader)
    await expect(reader.current()).resolves.toEqual({ userId: 'u_local', role: 'editor' })
  })

  it('refuses to boot in live mode, naming the missing session reader', () => {
    const env = parseEnv({ ...SECRET, PROVIDER_MODE: 'live' })

    expect(() => resolveSessionReader(env)).toThrow(ProviderConfigError)
    expect(() => resolveSessionReader(env)).toThrow(/session reader/i)
  })

  it('refuses to boot in production, even in mock mode', () => {
    const env = parseEnv({ ...SECRET, NODE_ENV: 'production' })

    expect(() => resolveSessionReader(env)).toThrow(/session reader/i)
  })
})
