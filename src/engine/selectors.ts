import { nasdaq } from "@/data/marketData";
import {
  LONG_TERM_DAYS,
  MIN_SCORING_DAYS,
  STARTING_CASH,
  type GameState,
} from "./types";

export function currentPrice(state: GameState): number {
  const price = nasdaq.close[state.day];
  if (price === undefined) {
    throw new Error(`No price data at day index ${state.day}`);
  }
  return price;
}

export function playerValue(state: GameState): number {
  return state.cash + state.shares * currentPrice(state);
}

export function npcValue(state: GameState, npcId: string): number {
  const npc = state.npcs.find((n) => n.id === npcId);
  if (!npc) return 0;
  return npc.cash + npc.shares * currentPrice(state);
}

export function elapsedDays(state: GameState): number {
  return state.day - state.startDay;
}

export function elapsedYears(state: GameState): number {
  return Math.max(elapsedDays(state), 1) / 252;
}

export function cagr(state: GameState, value: number): number {
  const years = elapsedYears(state);
  if (years <= 0) return 0;
  return Math.pow(Math.max(value, 1) / STARTING_CASH, 1 / years) - 1;
}

/** Annualized outperformance versus a given NPC, in basis points. CAGR
 * normalizes for runs of different lengths, so this is the leaderboard
 * metric: it stays comparable whether a run lasted one year or ten. */
export function edgeBpsVs(state: GameState, npcId: string): number {
  return (
    (cagr(state, playerValue(state)) - cagr(state, npcValue(state, npcId))) *
    10000
  );
}

/** A plain running percentage gap, safe to show live during a run. The
 * annualized edge figure blows up to nonsensical magnitudes over very
 * short elapsed-day counts (raising a small early difference to a large
 * power), so the UI shows this instead until a run actually ends - the
 * same small-sample problem is why canCashOut() below gates cashing out
 * on a minimum number of elapsed days. */
export function runningGapPctVs(state: GameState, npcId: string): number {
  const nv = npcValue(state, npcId);
  if (nv <= 0) return 0;
  return ((playerValue(state) - nv) / nv) * 100;
}

export function canCashOut(state: GameState): boolean {
  return elapsedDays(state) >= MIN_SCORING_DAYS;
}

export function isLongTermLot(state: GameState, lotDay: number): boolean {
  return state.day - lotDay > LONG_TERM_DAYS;
}
