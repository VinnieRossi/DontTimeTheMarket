import { describe, expect, it } from 'vitest'
import { ValidationError } from './errors'
import { err, isErr, isOk, mapOk, ok, unwrapOr } from './result'

describe('Result', () => {
  it('reports a success as ok and exposes its value', () => {
    const result = ok(3)
    expect(isOk(result)).toBe(true)
    expect(isErr(result)).toBe(false)
    if (isOk(result)) expect(result.value).toBe(3)
  })

  it('reports a failure as not ok and exposes its error', () => {
    const failure = new ValidationError('bad')
    const result = err(failure)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBe(failure)
  })

  it('returns the fallback only for a failure', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5)
    expect(unwrapOr(err(new ValidationError('bad')), 0)).toBe(0)
  })

  it('transforms a success and passes a failure through untouched', () => {
    expect(mapOk(ok(2), (n) => n * 2)).toEqual(ok(4))
    const failure = err(new ValidationError('bad'))
    expect(mapOk(failure, (n: number) => n * 2)).toBe(failure)
  })
})
