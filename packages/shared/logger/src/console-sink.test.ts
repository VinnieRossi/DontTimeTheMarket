import { afterEach, describe, expect, it, vi } from 'vitest'
import { Logger } from './logger'

/**
 * The default sink and the default level are what a caller gets when it constructs a logger
 * with no options, which is the common case, so they are tested rather than assumed.
 */
describe('default console sink', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env['LOG_LEVEL']
  })

  it('writes one JSON line per record, carrying the time, level, context, and message', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    new Logger('notes', { level: 'debug' }).info('note created', { noteId: 'n_1' })

    expect(info).toHaveBeenCalledTimes(1)
    const [line] = info.mock.calls[0] ?? []
    const parsed = JSON.parse(String(line)) as Record<string, unknown>
    expect(parsed).toMatchObject({
      level: 'info',
      context: 'notes',
      message: 'note created',
      fields: { noteId: 'n_1' },
    })
    expect(typeof parsed['time']).toBe('string')
  })

  it('routes warn to console.warn and error to console.error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const logger = new Logger('notes', { level: 'debug' })

    logger.warn('slow')
    logger.error('failed')

    expect(warn).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('routes debug through console.info, since debug is not its own console channel', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    new Logger('notes', { level: 'debug' }).debug('details')
    expect(info).toHaveBeenCalledTimes(1)
  })

  it('takes its level from LOG_LEVEL when no level is passed', () => {
    process.env['LOG_LEVEL'] = 'error'
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const logger = new Logger('notes')

    logger.info('ordinary')
    logger.error('broken')

    expect(info).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('falls back to info when LOG_LEVEL is absent or not a level', () => {
    process.env['LOG_LEVEL'] = 'not-a-level'
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const logger = new Logger('notes')

    logger.debug('dropped')
    logger.info('kept')

    expect(info).toHaveBeenCalledTimes(1)
  })
})
