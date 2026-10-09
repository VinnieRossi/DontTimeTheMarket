import { closeAt, maybeCloseAt } from './market-data'
import type { GameState, MomentumState } from './state'

/**
 * The path-dependent indicators. RSI and MACD are Wilder-smoothed from the run's start, so they
 * advance by one day with each tick and are carried in state, unlike the window-based indicators
 * in `technicals.ts` which can be recomputed from the series whenever they are shown.
 */
export function updateMomentum(state: GameState): GameState {
  const price = closeAt(state.day)
  const previous = maybeCloseAt(state.day - 1) ?? price
  const change = price - previous
  const gain = Math.max(change, 0)
  const loss = Math.max(-change, 0)

  const avgGain = (state.momentum.avgGain * 13 + gain) / 14
  const avgLoss = (state.momentum.avgLoss * 13 + loss) / 14

  const alpha12 = 2 / 13
  const alpha26 = 2 / 27
  const alpha9 = 2 / 10
  const previous12 = state.momentum.ema12
  const previous26 = state.momentum.ema26
  const previousSignal = state.momentum.signalEma
  const ema12 = previous12 === null ? price : previous12 + alpha12 * (price - previous12)
  const ema26 = previous26 === null ? price : previous26 + alpha26 * (price - previous26)
  const macd = ema12 - ema26
  const signalEma =
    previousSignal === null ? macd : previousSignal + alpha9 * (macd - previousSignal)

  const momentum: MomentumState = { avgGain, avgLoss, ema12, ema26, signalEma }
  return { ...state, momentum }
}

export function rsiFromMomentum(momentum: MomentumState): number {
  if (momentum.avgLoss === 0) return 100
  return 100 - 100 / (1 + momentum.avgGain / momentum.avgLoss)
}

export function macdFromMomentum(momentum: MomentumState): number {
  return (momentum.ema12 ?? 0) - (momentum.ema26 ?? 0)
}
