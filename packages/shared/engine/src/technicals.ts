import { closeAt } from './market-data'

/**
 * The indicators that only need a fixed lookback window, computed on demand from the baked
 * series rather than carried in state. The path-dependent ones (RSI, MACD) cannot be: they are
 * smoothed from the run's start, so they live in `momentum.ts` and advance with each tick.
 */

/**
 * Simple moving average of the close price ending at, and including, absolute index `endDay`,
 * over `period` days. Null until there is that much history.
 */
export function sma(endDay: number, period: number): number | null {
  if (endDay < period - 1) return null
  let sum = 0
  for (let day = endDay - period + 1; day <= endDay; day++) {
    sum += closeAt(day)
  }
  return sum / period
}

export interface BollingerBands {
  mid: number
  upper: number
  lower: number
}

export function bollingerBands(endDay: number, period = 20, multiplier = 2): BollingerBands | null {
  const mid = sma(endDay, period)
  if (mid === null) return null
  let variance = 0
  for (let day = endDay - period + 1; day <= endDay; day++) {
    variance += (closeAt(day) - mid) ** 2
  }
  const deviation = Math.sqrt(variance / period)
  return { mid, upper: mid + multiplier * deviation, lower: mid - multiplier * deviation }
}

/**
 * Average true range approximated from close-to-close moves, since the baked data is close only
 * and carries no intraday high or low. This is a simplified volatility read, not a textbook ATR
 * computed from real daily ranges.
 */
export function approximateAtr(endDay: number, period = 14): number | null {
  if (endDay < period) return null
  let sum = 0
  for (let day = endDay - period + 1; day <= endDay; day++) {
    sum += Math.abs(closeAt(day) - closeAt(day - 1))
  }
  return sum / period
}
