import { ValidationError } from '@dttm/types'
import { afterEach, describe, expect, it } from 'vitest'
import { parseEnv } from './schema'

describe('parseEnv', () => {
  it('runs with an empty environment, because the defaults are the mock setup', () => {
    const env = parseEnv({})
    expect(env.PROVIDER_MODE).toBe('mock')
    expect(env.NODE_ENV).toBe('development')
    expect(env.LOG_LEVEL).toBe('info')
    expect(env.APP_URL).toBe('http://localhost:3000')
  })

  it('treats an unfilled key as unset, so a default applies rather than an empty value', () => {
    expect(parseEnv({ DATABASE_DIR: '', PROVIDER_MODE: '' })).toMatchObject({
      DATABASE_DIR: '.data/app-db',
      PROVIDER_MODE: 'mock',
    })
  })

  it('keeps a value that was supplied', () => {
    expect(
      parseEnv({ PROVIDER_MODE: 'live', PIPELINE_SECRET: 's3cret', LOG_LEVEL: 'debug' })
    ).toMatchObject({
      PROVIDER_MODE: 'live',
      LOG_LEVEL: 'debug',
    })
  })

  it('refuses to boot without a pipeline secret in production or live mode', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(/PIPELINE_SECRET/)
    expect(() => parseEnv({ PROVIDER_MODE: 'live' })).toThrow(/PIPELINE_SECRET/)
    expect(() => parseEnv({ MAIL_PROVIDER_MODE: 'live' })).toThrow(/PIPELINE_SECRET/)
    expect(
      parseEnv({ NODE_ENV: 'production', PROVIDER_MODE: 'live', PIPELINE_SECRET: 's3cret' })
    ).toMatchObject({ PIPELINE_SECRET: 's3cret' })
    expect(parseEnv({ MAIL_PROVIDER_MODE: 'live', PIPELINE_SECRET: 's3cret' })).toMatchObject({
      MAIL_PROVIDER_MODE: 'live',
      PIPELINE_SECRET: 's3cret',
    })
  })

  it('rejects a value outside the allowed set', () => {
    expect(() => parseEnv({ PROVIDER_MODE: 'maybe' })).toThrow(ValidationError)
  })

  it('leaves the per-provider override unset when the key is absent, so the provider inherits the global default', () => {
    expect(parseEnv({}).MAIL_PROVIDER_MODE).toBeUndefined()
  })

  it('keeps an explicit per-provider override independent of the global default', () => {
    expect(
      parseEnv({ PROVIDER_MODE: 'live', MAIL_PROVIDER_MODE: 'mock', PIPELINE_SECRET: 's3cret' })
    ).toMatchObject({ PROVIDER_MODE: 'live', MAIL_PROVIDER_MODE: 'mock' })
  })

  it('rejects a per-provider override outside the allowed set', () => {
    expect(() => parseEnv({ MAIL_PROVIDER_MODE: 'maybe' })).toThrow(/MAIL_PROVIDER_MODE/)
  })

  it('rejects a malformed URL and a malformed address', () => {
    expect(() => parseEnv({ APP_URL: 'not-a-url' })).toThrow(/APP_URL/)
    expect(() => parseEnv({ MAIL_FROM: 'not-an-address' })).toThrow(/MAIL_FROM/)
  })

  it('lists every problem in one failure rather than the first', () => {
    const attempt = () => parseEnv({ PROVIDER_MODE: 'maybe', LOG_LEVEL: 'loud' })
    expect(attempt).toThrow(/PROVIDER_MODE/)
    expect(attempt).toThrow(/LOG_LEVEL/)
  })
})

describe('parseEnv with no source', () => {
  afterEach(() => {
    delete process.env['PROVIDER_MODE']
    delete process.env['PIPELINE_SECRET']
  })

  it('reads the process environment, which is what the application does at boot', () => {
    process.env['PROVIDER_MODE'] = 'live'
    process.env['PIPELINE_SECRET'] = 's3cret'
    expect(parseEnv().PROVIDER_MODE).toBe('live')
  })

  it('still applies every default when the process environment says nothing', () => {
    expect(parseEnv()).toMatchObject({ DATABASE_DIR: '.data/app-db', LOG_LEVEL: 'info' })
  })
})
