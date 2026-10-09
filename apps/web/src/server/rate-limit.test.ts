import { FixedClock } from '@dttm/providers'
import { RateLimitError } from '@dttm/types'
import { describe, expect, it } from 'vitest'
import { FixedWindowRateLimiter, READ_RULE, WRITE_RULE } from './rate-limit'

const START = new Date('2026-04-01T12:00:00.000Z')
const rule = { name: 'test', limit: 3, windowSeconds: 60 }

describe('FixedWindowRateLimiter', () => {
  it('allows requests up to the limit', () => {
    const limiter = new FixedWindowRateLimiter(new FixedClock(START))
    for (let attempt = 0; attempt < rule.limit; attempt += 1) {
      expect(() => limiter.check(rule, 'caller')).not.toThrow()
    }
  })

  it('refuses the request past the limit, saying when to come back', () => {
    const clock = new FixedClock(START)
    const limiter = new FixedWindowRateLimiter(clock)
    for (let attempt = 0; attempt < rule.limit; attempt += 1) limiter.check(rule, 'caller')

    try {
      limiter.check(rule, 'caller')
      throw new Error('expected the limiter to refuse')
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError)
      if (error instanceof RateLimitError) {
        expect(error.status).toBe(429)
        expect(error.retryAfterSeconds).toBeGreaterThan(0)
        expect(error.retryAfterSeconds).toBeLessThanOrEqual(rule.windowSeconds)
      }
    }
  })

  it('counts each caller separately, so one caller cannot exhaust another allowance', () => {
    const limiter = new FixedWindowRateLimiter(new FixedClock(START))
    for (let attempt = 0; attempt < rule.limit; attempt += 1) limiter.check(rule, 'first')

    expect(() => limiter.check(rule, 'second')).not.toThrow()
  })

  it('counts each rule separately, so reads and writes have their own allowance', () => {
    const limiter = new FixedWindowRateLimiter(new FixedClock(START))
    for (let attempt = 0; attempt < rule.limit; attempt += 1) limiter.check(rule, 'caller')

    expect(() => limiter.check({ ...rule, name: 'other' }, 'caller')).not.toThrow()
  })

  it('starts a fresh window once the old one has passed', () => {
    const clock = new FixedClock(START)
    const limiter = new FixedWindowRateLimiter(clock)
    for (let attempt = 0; attempt < rule.limit; attempt += 1) limiter.check(rule, 'caller')
    expect(() => limiter.check(rule, 'caller')).toThrow(RateLimitError)

    clock.advance(rule.windowSeconds + 1)
    expect(() => limiter.check(rule, 'caller')).not.toThrow()
  })

  it('allows writes less freely than reads, since they cost more', () => {
    expect(WRITE_RULE.limit).toBeLessThan(READ_RULE.limit)
  })
})
