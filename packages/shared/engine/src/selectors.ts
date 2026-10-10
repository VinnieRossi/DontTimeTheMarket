import { externalNpcValue } from './external-npcs'
import { closeAt, SERIES_LENGTH } from './market-data'
import { BOGLE_NPC_ID } from './npc'
import { LONG_TERM_DAYS } from './rules'
import {
  cagrOf,
  canCashOutAfter,
  edgeBpsOf,
  elapsedYearsOf,
  hasRoomAfter,
  runningGapPctOf,
  totalReturnPctOf,
} from './scoring'
import type { GameState } from './state'

/** Every read a screen or a rule needs from an index run, derived rather than stored. */

export function currentPrice(state: GameState): number {
  return closeAt(state.day)
}

export function playerValue(state: GameState): number {
  return state.cash + state.shares * currentPrice(state)
}

export function npcValue(state: GameState, npcId: string): number {
  const npc = state.npcs.find((candidate) => candidate.id === npcId)
  if (npc !== undefined) return npc.cash + npc.shares * currentPrice(state)
  const external = state.externalNpcs.find((candidate) => candidate.id === npcId)
  if (external !== undefined) return externalNpcValue(external, state.day)
  return 0
}

export function elapsedDays(state: GameState): number {
  return state.day - state.startDay
}

export function elapsedYears(state: GameState): number {
  return elapsedYearsOf(elapsedDays(state))
}

export function cagr(state: GameState, value: number): number {
  return cagrOf(value, elapsedDays(state))
}

export function edgeBpsVs(state: GameState, npcId: string): number {
  return edgeBpsOf(playerValue(state), npcValue(state, npcId), elapsedDays(state))
}

export function runningGapPctVs(state: GameState, npcId: string): number {
  return runningGapPctOf(playerValue(state), npcValue(state, npcId))
}

export function canCashOut(state: GameState): boolean {
  return canCashOutAfter(elapsedDays(state))
}

/**
 * Whether the baked history has room for another run length after this run's last day. A run that
 * has reached the end of the data cannot be extended, however well it went.
 */
export function hasRoomToContinue(state: GameState): boolean {
  return hasRoomAfter(state.day, state.runLength, SERIES_LENGTH)
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
  return totalReturnPctOf(playerValue(state))
}
