/**
 * mulberry32, a small deterministic PRNG. Given the same seed, it always produces the same
 * sequence. The engine threads the counter through `GameState.rngState` rather than keeping a
 * module-level generator instance, so `step(state, action)` stays a pure function: calling it
 * twice with the same state and action always produces the same result, which is what makes
 * server-side replay verification of a score possible later.
 */

export interface Draw {
  /** The advanced counter, which the caller stores back into state. */
  readonly state: number
  readonly value: number
}

/** Advances the counter by one step and returns both the new counter and a float in [0, 1). */
export function nextRandom(state: number): Draw {
  const advanced = (state + 0x6d2b79f5) | 0
  let t = advanced
  t = Math.imul(t ^ (t >>> 15), 1 | t)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return { state: advanced, value: ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Draws an integer in [0, max). */
export function nextInt(state: number, max: number): Draw {
  const draw = nextRandom(state)
  return { state: draw.state, value: Math.floor(draw.value * max) }
}

/**
 * Draws one member of a non-empty list. The list's type carries its first element, so the draw
 * resolves to a value rather than to something possibly undefined; the fallback is unreachable
 * and exists only because an index computed at runtime cannot prove that to the type checker.
 */
export function pickFrom<T>(
  state: number,
  items: readonly [T, ...T[]]
): { state: number; value: T } {
  const draw = nextInt(state, items.length)
  return { state: draw.state, value: items[draw.value] ?? items[0] }
}
