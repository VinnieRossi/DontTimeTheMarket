/**
 * Presentation formatting shared by the screens and their stories. It lives here rather than in
 * the component layer so a story, a test, and the running app all render the same string, and so
 * the component layer keeps no logic of its own.
 */

/** Dollars, rounded to whole ones, with the sign in front of the symbol rather than after it. */
export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : ''
  const magnitude = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })
  return `${sign}$${magnitude}`
}

/** A percentage, to one decimal place, with an explicit plus on anything that is not negative. */
export function formatSignedPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

/** A percentage, to one decimal place, with no sign added. */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Basis points, rounded to whole ones, signed. The score is reported in basis points rather than
 * percent because the difference between a run and its benchmark is usually a fraction of one.
 */
export function formatBasisPoints(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value)} bps`
}

/**
 * A difference between two percentages, in percentage points, to one decimal place and signed.
 * It reads in points rather than as a percent because a holding at 41% against a 33% target is
 * eight points away, not eight percent away, and saying percent there invites the wrong reading.
 */
export function formatSignedPoints(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)} pts`
}

/** A whole percentage, for a figure a player sets in whole steps. */
export function formatWholePercent(value: number): string {
  return `${Math.round(value)}%`
}

/** A share count, to two decimal places, because a dollar-sized buy rarely lands on a whole one. */
export function formatShares(value: number): string {
  return value.toFixed(2)
}
