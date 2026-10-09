/**
 * mulberry32, a small deterministic PRNG. Given the same seed, it always
 * produces the same sequence. The engine threads the counter through
 * GameState.rngState rather than keeping a module-level generator
 * instance, so step(state, action) stays a pure function: calling it
 * twice with the same state and action always produces the same result,
 * which is what makes server-side leaderboard replay verification work.
 */

/** Advances the PRNG counter by one step and returns both the new
 * counter and a float in [0, 1). */
export function nextRandom(state: number): { state: number; value: number } {
  let s = (state + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: s, value };
}

/** Draws an integer in [0, max). */
export function nextInt(
  state: number,
  max: number,
): { state: number; value: number } {
  const { state: nextState, value } = nextRandom(state);
  return { state: nextState, value: Math.floor(value * max) };
}
