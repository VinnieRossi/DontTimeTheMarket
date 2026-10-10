/**
 * The indicators that only need a fixed lookback window, computed on demand from whatever series
 * is being charted rather than carried in state. The path-dependent ones (RSI, MACD) cannot be:
 * they are smoothed from the run's start, so they live in `momentum.ts` and advance with each tick.
 *
 * Each one reads the series through an accessor rather than reaching for the baked index directly,
 * because the line on the screen is the index price in an index run and the portfolio's own value
 * in a portfolio run. A day the accessor has no value for makes the whole window unanswerable, so
 * the result is null rather than an average over a shorter window than the one that was asked for.
 */
export type PriceAt = (day: number) => number | undefined

/** Every close in the inclusive window, or null if any day in it has no value. */
function window(priceAt: PriceAt, endDay: number, period: number): number[] | null {
  if (endDay < period - 1) return null
  const values: number[] = []
  for (let day = endDay - period + 1; day <= endDay; day++) {
    const value = priceAt(day)
    if (value === undefined) return null
    values.push(value)
  }
  return values
}

/**
 * Simple moving average of the series ending at, and including, absolute index `endDay`, over
 * `period` days. Null until there is that much history.
 */
export function sma(priceAt: PriceAt, endDay: number, period: number): number | null {
  const values = window(priceAt, endDay, period)
  if (values === null) return null
  return values.reduce((sum, value) => sum + value, 0) / period
}

export interface BollingerBands {
  mid: number
  upper: number
  lower: number
}

export function bollingerBands(
  priceAt: PriceAt,
  endDay: number,
  period = 20,
  multiplier = 2
): BollingerBands | null {
  const values = window(priceAt, endDay, period)
  if (values === null) return null
  const mid = values.reduce((sum, value) => sum + value, 0) / period
  const variance = values.reduce((sum, value) => sum + (value - mid) ** 2, 0) / period
  const deviation = Math.sqrt(variance)
  return { mid, upper: mid + multiplier * deviation, lower: mid - multiplier * deviation }
}

/**
 * Average true range approximated from close-to-close moves, since the baked data is close only
 * and carries no intraday high or low. This is a simplified volatility read, not a textbook ATR
 * computed from real daily ranges.
 */
export function approximateAtr(priceAt: PriceAt, endDay: number, period = 14): number | null {
  const values = window(priceAt, endDay, period + 1)
  if (values === null) return null
  let sum = 0
  for (let index = 1; index < values.length; index++) {
    sum += Math.abs((values[index] ?? 0) - (values[index - 1] ?? 0))
  }
  return sum / period
}
