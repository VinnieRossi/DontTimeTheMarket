import { closeAt, SERIES_LENGTH } from './market-data'
import { BOGLE_NPC_ID } from './npc'
import {
  LONG_TERM_DAYS,
  MIN_SCORING_DAYS,
  RUN_LENGTH_DAYS,
  STARTING_CASH,
  TRADING_DAYS_PER_YEAR,
} from './rules'
import type { GameState } from './state'

/** Every read a screen or a rule needs from a run, derived rather than stored. */

export function currentPrice(state: GameState): number {
  return closeAt(state.day)
}

export function playerValue(state: GameState): number {
  return state.cash + state.shares * currentPrice(state)
}

export function npcValue(state: GameState, npcId: string): number {
  const npc = state.npcs.find((candidate) => candidate.id === npcId)
  if (npc === undefined) return 0
  return npc.cash + npc.shares * currentPrice(state)
}

export function elapsedDays(state: GameState): number {
  return state.day - state.startDay
}

export function elapsedYears(state: GameState): number {
  return Math.max(elapsedDays(state), 1) / TRADING_DAYS_PER_YEAR
}

export function cagr(state: GameState, value: number): number {
  const years = elapsedYears(state)
  if (years <= 0) return 0
  return (Math.max(value, 1) / STARTING_CASH) ** (1 / years) - 1
}

/**
 * Annualized outperformance versus a given NPC, in basis points. CAGR normalizes for runs of
 * different lengths, so this is the score: it stays comparable whether a run lasted one year or
 * ten.
 */
export function edgeBpsVs(state: GameState, npcId: string): number {
  return (cagr(state, playerValue(state)) - cagr(state, npcValue(state, npcId))) * 10000
}

/**
 * A plain running percentage gap, safe to show live during a run. The annualized edge figure
 * blows up to nonsensical magnitudes over very short elapsed-day counts (raising a small early
 * difference to a large power), so the screen shows this instead until a run actually ends. The
 * same small-sample problem is why cashing out is gated on a minimum number of elapsed days.
 */
export function runningGapPctVs(state: GameState, npcId: string): number {
  const value = npcValue(state, npcId)
  if (value <= 0) return 0
  return ((playerValue(state) - value) / value) * 100
}

export function canCashOut(state: GameState): boolean {
  return elapsedDays(state) >= MIN_SCORING_DAYS
}

/**
 * Whether the baked history has room for another run length after this run's last day. A run that
 * has reached the end of the data cannot be extended, however well it went.
 */
export function hasRoomToContinue(state: GameState): boolean {
  return state.day + RUN_LENGTH_DAYS[state.runLength] < SERIES_LENGTH - 2
}

/**
 * Whether a finished run may be extended. Only a run that is ahead of the benchmark is offered
 * one, which is the whole joke: the reward for beating buy-and-hold is another chance to lose to
 * it over a longer horizon.
 */
export function canContinue(state: GameState): boolean {
  return state.phase === 'ended' && edgeBpsVs(state, BOGLE_NPC_ID) >= 0 && hasRoomToContinue(state)
}

export function isLongTermLot(state: GameState, lotDay: number): boolean {
  return state.day - lotDay > LONG_TERM_DAYS
}

/** The plain percentage gain or loss on the player's position, for the end-of-run summary. */
export function totalReturnPct(state: GameState): number {
  return (playerValue(state) / STARTING_CASH - 1) * 100
}
