import type { Clock } from '@dttm/contracts'
import { RateLimitError } from '@dttm/types'

/**
 * A fixed-window rate limiter, applied at two levels: a broad ceiling per caller, and a tighter one
 * for the operations that write. Reads and writes cost different amounts, so one limit for both is
 * either too loose to protect anything or too tight to use.
 *
 * It counts in memory, which means it limits one instance rather than a fleet. That is the right
 * shape for a template and the wrong shape for a deployment behind several instances, where the
 * counter belongs somewhere shared. The interface is what a project keeps when it swaps the
 * counting.
 */
export interface RateLimitRule {
  /** What the limit is about, which also separates one rule's counters from another's. */
  name: string
  limit: number
  windowSeconds: number
}

export const READ_RULE: RateLimitRule = { name: 'read', limit: 300, windowSeconds: 60 }
export const WRITE_RULE: RateLimitRule = { name: 'write', limit: 30, windowSeconds: 60 }

interface Window {
  count: number
  resetAt: number
}

export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>()
  private readonly clock: Clock

  constructor(clock: Clock) {
    this.clock = clock
  }

  /**
   * Count one request against a rule.
   *
   * @throws {RateLimitError} when the caller has used the window up, carrying how long until it
   * resets so the caller is told when to come back rather than left to guess.
   */
  check(rule: RateLimitRule, caller: string): void {
    const now = this.clock.now().getTime()
    const key = `${rule.name}:${caller}`
    const existing = this.windows.get(key)

    if (existing === undefined || existing.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 })
      this.forgetExpired(now)
      return
    }

    if (existing.count >= rule.limit) {
      throw new RateLimitError(Math.max(1, Math.ceil((existing.resetAt - now) / 1000)))
    }
    existing.count += 1
  }

  /**
   * Drop windows that have already reset. Without this the map grows for the lifetime of the
   * process, one entry per caller ever seen, which is a slow leak rather than a visible failure.
   */
  private forgetExpired(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key)
    }
  }
}
