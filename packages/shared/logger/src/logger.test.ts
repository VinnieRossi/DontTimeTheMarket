import { describe, expect, it } from 'vitest'
import { createRecordingLogger, Logger } from './logger'
import { REDACTED } from './redact'

describe('Logger', () => {
  it('writes the level, context, and message of every record', () => {
    const { logger, records } = createRecordingLogger('notes')
    logger.info('note created')
    expect(records).toEqual([{ level: 'info', context: 'notes', message: 'note created' }])
  })

  it('drops records below the configured level', () => {
    const records: unknown[] = []
    const logger = new Logger('notes', { level: 'warn', sink: (r) => records.push(r) })
    logger.debug('noisy')
    logger.info('ordinary')
    logger.warn('worth seeing')
    logger.error('broken')
    expect(records).toHaveLength(2)
  })

  it('names a child logger after its parent and keeps the bound fields', () => {
    const { logger, records } = createRecordingLogger('http')
    const scoped = logger.child('notes', { requestId: 'req_1' })
    scoped.info('handling', { noteId: 'n_1' })
    expect(records[0]).toMatchObject({
      context: 'http:notes',
      fields: { requestId: 'req_1', noteId: 'n_1' },
    })
  })

  it('lets a grandchild inherit every ancestor field', () => {
    const { logger, records } = createRecordingLogger('http')
    logger.child('request', { requestId: 'req_1' }).child('notes', { noteId: 'n_1' }).info('deep')
    expect(records[0]).toMatchObject({
      context: 'http:request:notes',
      fields: { requestId: 'req_1', noteId: 'n_1' },
    })
  })

  it('omits the fields key entirely when there is nothing to attach', () => {
    const { logger, records } = createRecordingLogger()
    logger.info('bare')
    expect(records[0] && 'fields' in records[0]).toBe(false)
  })

  it('redacts credential-shaped fields before they reach the sink', () => {
    const { logger, records } = createRecordingLogger()
    logger.info('config loaded', { apiKey: 'sk_live_1', mode: 'mock' })
    expect(records[0]?.fields).toEqual({ apiKey: REDACTED, mode: 'mock' })
  })

  it('lets a call-site field override an inherited one', () => {
    const { logger, records } = createRecordingLogger()
    const scoped = logger.child('job', { attempt: 1 })
    scoped.warn('retrying', { attempt: 2 })
    expect(records[0]?.fields).toMatchObject({ attempt: 2 })
  })
})
