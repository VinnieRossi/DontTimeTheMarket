import { closeAt, maybeCloseAt } from './market-data'
import type { MomentumState } from './state'

/**
 * The path-dependent indicators. RSI and MACD are Wilder-smoothed from the run's start, so they
 * advance by one day with each tick and are carried in state, unlike the window-based indicators
 * in `technicals.ts` which can be recomputed from the series whenever they are shown.
 */

export const EMPTY_MOMENTUM: MomentumState = {
  avgGain: 0,
  avgLoss: 0,
  ema12: null,
  ema26: null,
  signalEma: null,
}

/**
 * Advances the smoothed averages by one day, given today's reading and yesterday's. It takes two
 * numbers rather than a run, because the series it smooths is the index price in an index run and
 * the portfolio's own value in a portfolio run, and the smoothing is identical either way.
 */
export function advanceMomentum(
  momentum: MomentumState,
  price: number,
  previousPrice: number
): MomentumState {
  const change = price - previousPrice
  const gain = Math.max(change, 0)
  const loss = Math.max(-change, 0)

  const avgGain = (momentum.avgGain * 13 + gain) / 14
  const avgLoss = (momentum.avgLoss * 13 + loss) / 14

  const alpha12 = 2 / 13
  const alpha26 = 2 / 27
  const alpha9 = 2 / 10
  const previous12 = momentum.ema12
  const previous26 = momentum.ema26
  const previousSignal = momentum.signalEma
  const ema12 = previous12 === null ? price : previous12 + alpha12 * (price - previous12)
  const ema26 = previous26 === null ? price : previous26 + alpha26 * (price - previous26)
  const macd = ema12 - ema26
  const signalEma =
    previousSignal === null ? macd : previousSignal + alpha9 * (macd - previousSignal)

  return { avgGain, avgLoss, ema12, ema26, signalEma }
}

/** Advances the momentum carried by an index run, which smooths the baked index price. */
export function updateMomentum<T extends { day: number; momentum: MomentumState }>(state: T): T {
  const price = closeAt(state.day)
  const previous = maybeCloseAt(state.day - 1) ?? price
  return { ...state, momentum: advanceMomentum(state.momentum, price, previous) }
}

export function rsiFromMomentum(momentum: MomentumState): number {
  if (momentum.avgLoss === 0) return 100
  return 100 - 100 / (1 + momentum.avgGain / momentum.avgLoss)
}

export function macdFromMomentum(momentum: MomentumState): number {
  return (momentum.ema12 ?? 0) - (momentum.ema26 ?? 0)
}
