import { nasdaq } from "@/data/marketData";
import type { GameState, MomentumState } from "./types";

/** Updates the incremental RSI and MACD state by one day. These are
 * path-dependent (Wilder-smoothed since the run's start), unlike the
 * simple-moving-average-based indicators in technicals.ts, which only
 * need a fixed lookback window and so are computed on demand instead of
 * carried in state. */
export function updateMomentum(state: GameState): GameState {
  const price = nasdaq.close[state.day]!;
  const prevPrice = nasdaq.close[state.day - 1] ?? price;
  const change = price - prevPrice;
  const gain = Math.max(change, 0);
  const loss = Math.max(-change, 0);

  const avgGain = (state.momentum.avgGain * 13 + gain) / 14;
  const avgLoss = (state.momentum.avgLoss * 13 + loss) / 14;

  const alpha12 = 2 / 13;
  const alpha26 = 2 / 27;
  const alpha9 = 2 / 10;
  const ema12 =
    state.momentum.ema12 === null
      ? price
      : state.momentum.ema12 + alpha12 * (price - state.momentum.ema12);
  const ema26 =
    state.momentum.ema26 === null
      ? price
      : state.momentum.ema26 + alpha26 * (price - state.momentum.ema26);
  const macd = ema12 - ema26;
  const signalEma =
    state.momentum.signalEma === null
      ? macd
      : state.momentum.signalEma + alpha9 * (macd - state.momentum.signalEma);

  const momentum: MomentumState = { avgGain, avgLoss, ema12, ema26, signalEma };
  return { ...state, momentum };
}

export function rsiFromMomentum(momentum: MomentumState): number {
  if (momentum.avgLoss === 0) return 100;
  const rs = momentum.avgGain / momentum.avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macdFromMomentum(momentum: MomentumState): number {
  return (momentum.ema12 ?? 0) - (momentum.ema26 ?? 0);
}
