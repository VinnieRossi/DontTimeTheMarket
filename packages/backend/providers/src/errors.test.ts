import { ExternalServiceError } from '@dttm/types'
import { describe, expect, it } from 'vitest'
import { toExternalServiceError, wrapExternalCall } from './errors'

describe('wrapExternalCall', () => {
  it('passes a successful call through', async () => {
    const result = await wrapExternalCall('mail', 'could not send', () => Promise.resolve('sent'))
    expect(result).toEqual({ ok: true, value: 'sent' })
  })

  it('turns a thrown outside error into this codebase own error type', async () => {
    const vendor = new Error('connection reset by peer')
    const result = await wrapExternalCall('mail', 'could not send', () => Promise.reject(vendor))

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ExternalServiceError)
      expect(result.error.code).toBe('EXTERNAL_SERVICE_ERROR')
      expect(result.error.message).toBe('could not send')
      expect(result.error.cause).toBe(vendor)
    }
  })

  it('names the provider, so a failure says which boundary raised it', async () => {
    const result = await wrapExternalCall('queue', 'could not enqueue', () =>
      Promise.reject(new Error('down'))
    )
    if (!result.ok) expect(result.error.provider).toBe('queue')
  })

  it('normalizes a thrown value that is not an Error at all', async () => {
    const result = await wrapExternalCall('mail', 'could not send', () => Promise.reject('nope'))
    if (!result.ok) expect(result.error.cause).toBe('nope')
  })
})

describe('toExternalServiceError', () => {
  it('keeps the original as the cause, so the trail survives normalization', () => {
    const original = { status: 503 }
    const error = toExternalServiceError('mail', 'service unavailable', original)
    expect(error.cause).toBe(original)
    expect(error.provider).toBe('mail')
  })
})
