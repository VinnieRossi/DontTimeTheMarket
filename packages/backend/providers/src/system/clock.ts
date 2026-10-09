import type { Clock } from '@dttm/contracts'

/** The real clock. Everything that needs the time takes it from a Clock, never from Date. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

/**
 * A clock that stays where it is put, and moves only when told. Tests use it so a result never
 * depends on how long the test took to run, which is the usual cause of a suite that fails once
 * a week on a slow machine.
 */
export class FixedClock implements Clock {
  private current: Date

  constructor(start: Date) {
    this.current = start
  }

  now(): Date {
    return this.current
  }

  /** Move the clock forward, to exercise a lease expiring or a backoff elapsing. */
  advance(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000)
  }
}
