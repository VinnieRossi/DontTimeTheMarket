import { describe, expect, it } from 'vitest'
import { REDACTED, redact } from './redact'

describe('redact', () => {
  it('replaces credential-shaped keys and leaves the rest alone', () => {
    expect(redact({ password: 'hunter2', email: 'a@example.com' })).toEqual({
      password: REDACTED,
      email: 'a@example.com',
    })
  })

  it('matches keys regardless of case, separator, or surrounding words', () => {
    expect(
      redact({
        API_KEY: 'x',
        'x-api-key': 'x',
        stripeSecretKey: 'x',
        Authorization: 'x',
        sessionId: 'x',
      })
    ).toEqual({
      API_KEY: REDACTED,
      'x-api-key': REDACTED,
      stripeSecretKey: REDACTED,
      Authorization: REDACTED,
      sessionId: REDACTED,
    })
  })

  it('walks nested objects and arrays', () => {
    expect(redact({ outer: { token: 'x', keep: 1 }, list: [{ cvv: '123' }] })).toEqual({
      outer: { token: REDACTED, keep: 1 },
      list: [{ cvv: REDACTED }],
    })
  })

  it('reduces an error to its name, message, and code instead of serializing it whole', () => {
    const error = Object.assign(new Error('nope'), { code: 'E_NOPE', request: { token: 'x' } })
    expect(redact(error)).toEqual({ name: 'Error', message: 'nope', code: 'E_NOPE' })
  })

  it('stops at a depth ceiling rather than following a deep or cyclic structure', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 'far' } } } } } } }
    expect(redact(deep)).toEqual({ a: { b: { c: { d: { e: { f: REDACTED } } } } } })
  })

  it('passes primitives through untouched', () => {
    expect(redact('plain')).toBe('plain')
    expect(redact(7)).toBe(7)
    expect(redact(null)).toBe(null)
    expect(redact(undefined)).toBe(undefined)
  })
})
