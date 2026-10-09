import type { Database } from '@dttm/database'
import { createInMemoryDatabase } from '@dttm/database/runtime'
import { parseEnv } from '@dttm/env'
import { createRecordingLogger } from '@dttm/logger'
import { beforeAll, describe, expect, it } from 'vitest'
import { createProviders, ProviderConfigError, resolveMockedProviders } from './factory'
import { RecordingMailProvider } from './mail/recording-mail-provider'
import { DrizzleQueueProvider } from './queue/drizzle-queue-provider'

let db: Database
const { logger } = createRecordingLogger('factory')

beforeAll(async () => {
  db = await createInMemoryDatabase()
})

describe('createProviders', () => {
  it('records mail rather than sending it in mock mode, so no account is needed', () => {
    const providers = createProviders({ env: parseEnv({}), logger, db })

    expect(providers.mail).toBeInstanceOf(RecordingMailProvider)
    expect(providers.clock.now()).toBeInstanceOf(Date)
    expect(providers.ids.next('note')).toMatch(/^note_/)
  })

  it('needs no configuration at all in mock mode, which is what a fresh clone has', () => {
    expect(() => createProviders({ env: parseEnv({}), logger, db })).not.toThrow()
  })

  it('refuses to boot in live mode while mail has no real adapter, and names it', () => {
    const live = parseEnv({ PROVIDER_MODE: 'live', PIPELINE_SECRET: 's3cret' })

    expect(() => createProviders({ env: live, logger, db })).toThrow(ProviderConfigError)
    expect(() => createProviders({ env: live, logger, db })).toThrow(/mail adapter/)
  })

  it('uses the durable queue in mock mode', () => {
    expect(createProviders({ env: parseEnv({}), logger, db }).queue).toBeInstanceOf(
      DrizzleQueueProvider
    )
  })

  it('reports a configuration failure as a server fault, not a caller mistake', () => {
    expect(new ProviderConfigError('missing something').status).toBe(500)
    expect(new ProviderConfigError('missing something').code).toBe('PROVIDER_CONFIG_ERROR')
  })

  it('lets mail inherit the global default when its own override is unset', () => {
    const live = parseEnv({ PROVIDER_MODE: 'live', PIPELINE_SECRET: 's3cret' })
    expect(() => createProviders({ env: live, logger, db })).toThrow(/mail/)

    const mock = parseEnv({})
    expect(createProviders({ env: mock, logger, db }).mail).toBeInstanceOf(RecordingMailProvider)
  })

  it('lets an explicit mock override keep mail mocked while every other provider runs live', () => {
    const env = parseEnv({
      PROVIDER_MODE: 'live',
      MAIL_PROVIDER_MODE: 'mock',
      PIPELINE_SECRET: 's3cret',
    })

    expect(createProviders({ env, logger, db }).mail).toBeInstanceOf(RecordingMailProvider)
  })

  it('refuses an explicit live override for mail while it has no real adapter, even with the global default mocked', () => {
    const env = parseEnv({ MAIL_PROVIDER_MODE: 'live', PIPELINE_SECRET: 's3cret' })

    expect(() => createProviders({ env, logger, db })).toThrow(ProviderConfigError)
    expect(() => createProviders({ env, logger, db })).toThrow(/mail/)
  })

  it('refuses to boot in production when mail is mocked only by inheriting the global default', () => {
    const env = parseEnv({ NODE_ENV: 'production', PIPELINE_SECRET: 's3cret' })

    expect(() => createProviders({ env, logger, db })).toThrow(ProviderConfigError)
    expect(() => createProviders({ env, logger, db })).toThrow(/mail/)
  })

  it('allows mail mocked in production when its own override says so explicitly, and warns once', () => {
    const env = parseEnv({
      NODE_ENV: 'production',
      MAIL_PROVIDER_MODE: 'mock',
      PIPELINE_SECRET: 's3cret',
    })
    const { logger: prodLogger, records } = createRecordingLogger('factory-prod')

    const providers = createProviders({ env, logger: prodLogger, db })

    expect(providers.mail).toBeInstanceOf(RecordingMailProvider)
    const warning = records.find((record) => record.level === 'warn')
    expect(warning?.message).toMatch(/mocked/)
    expect(warning?.fields?.['mockedProviders']).toEqual(['mail'])
  })
})

describe('resolveMockedProviders', () => {
  it('reports no mocked providers when everything inherits a live global default', () => {
    const env = parseEnv({ PROVIDER_MODE: 'live', PIPELINE_SECRET: 's3cret' })
    expect(resolveMockedProviders(env)).toEqual([])
  })

  it('names mail when it inherits a mocked global default', () => {
    expect(resolveMockedProviders(parseEnv({}))).toEqual(['mail'])
  })

  it('names mail when its own override mocks it despite a live global default', () => {
    const env = parseEnv({
      PROVIDER_MODE: 'live',
      MAIL_PROVIDER_MODE: 'mock',
      PIPELINE_SECRET: 's3cret',
    })
    expect(resolveMockedProviders(env)).toEqual(['mail'])
  })
})
