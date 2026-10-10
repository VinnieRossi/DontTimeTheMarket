/**
 * Where a run's seed comes from, and the only place this package reaches for real entropy.
 *
 * It is a plain function rather than a hook because the seed is drawn in an event handler, when a
 * player chooses to start something, and never during a render. Drawing it in a render would
 * produce one number on the server and a different one in the browser, and the screen would
 * disagree with itself on the first paint.
 *
 * Everything after this point is driven deterministically by the engine from the number drawn
 * here, which is what makes a run reproducible from its seed.
 */
export function drawSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}
