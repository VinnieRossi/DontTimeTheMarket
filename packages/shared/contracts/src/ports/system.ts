/**
 * The two ambient capabilities that would otherwise make every test that touches them
 * non-deterministic. Both are ports for the same reason a payment provider is: the code that
 * needs the current time or a new identifier depends on an interface, and the caller decides
 * what satisfies it.
 */

export interface Clock {
  /** The current instant. Injected so a test can pin it rather than tolerate whatever it gets. */
  now(): Date
}

export interface IdGenerator {
  /** A new identifier, prefixed so an id in a log line says what kind of thing it names. */
  next(prefix: string): string
}
