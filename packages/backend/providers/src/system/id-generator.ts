import { randomUUID } from 'node:crypto'
import type { IdGenerator } from '@dttm/contracts'

/** The real generator. The prefix makes an identifier say what kind of thing it names. */
export class RandomIdGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}_${randomUUID()}`
  }
}

/**
 * A generator that counts. Tests use it so an assertion can name the identifier it expects
 * instead of matching a pattern, which is the difference between a test that describes the
 * outcome and one that describes a shape.
 */
export class SequentialIdGenerator implements IdGenerator {
  private counts = new Map<string, number>()

  next(prefix: string): string {
    const next = (this.counts.get(prefix) ?? 0) + 1
    this.counts.set(prefix, next)
    return `${prefix}_${next}`
  }
}
