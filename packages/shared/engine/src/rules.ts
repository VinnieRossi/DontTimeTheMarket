/**
 * The numbers the simulation is played by. They sit together, outside the state shape, because
 * they are the levers a balance change moves and a reader looking for "what does a trade cost"
 * should not have to read the reducer to find out.
 */

export type RunLength = 'short' | 'standard' | 'long'

export const RUN_LENGTH_DAYS: Record<RunLength, number> = {
  short: 252,
  standard: 756,
  long: 2520,
}

export const STARTING_CASH = 10_000
export const LONG_TERM_DAYS = 252
export const TAX_SHORT_RATE = 0.24
export const TAX_LONG_RATE = 0.15
export const DIVIDEND_TAX_RATE = 0.15
export const FEE_BPS = 3
export const MIN_SCORING_DAYS = 42
export const TRADING_DAYS_PER_YEAR = 252

/**
 * Flat fallback annualized rate for idle cash interest when the baked 3-month T-bill series has
 * no value for a given day (it should not happen with the current baked range, but it keeps the
 * engine total).
 */
export const IDLE_CASH_FALLBACK_APY = 0.02

/**
 * Illustrative annualized dividend yield for the index. FRED has no free, no-key, per-day
 * dividend-yield series for the Nasdaq Composite, so this is a flat, disclosed approximation
 * rather than fetched data.
 */
export const INDEX_DIVIDEND_YIELD = 0.018
export const DIVIDEND_PERIOD_DAYS = 63

/** Share quantities below this count as nothing left, which keeps float dust out of the lot list. */
export const SHARE_EPSILON = 1e-9

export type Speed = 'paused' | '1x' | '4x' | '16x'

export const SPEEDS: readonly Speed[] = ['paused', '1x', '4x', '16x']

/** Milliseconds between ticks at each speed. Zero means the clock is not running. */
export const SPEED_MS: Record<Speed, number> = {
  paused: 0,
  '1x': 550,
  '4x': 160,
  '16x': 45,
}

/** How many days of history the chart shows behind the current day. */
export const CHART_WINDOW_DAYS = 180

/** How many elapsed days have to pass before the commentary may change again. */
export const COMMENT_INTERVAL_DAYS = 12

/** The chance that a commentary slot actually produces a new line rather than staying quiet. */
export const COMMENT_CHANCE = 0.35
