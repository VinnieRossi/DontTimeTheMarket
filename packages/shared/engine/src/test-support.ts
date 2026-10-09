import type { Action, GameState } from './state'
import { startRun, step } from './step'

/**
 * Helpers the engine's own tests share. A run is opened from an explicit seed rather than from a
 * default, because a test that does not name its seed is a test whose failure nobody can
 * reproduce.
 */

export function freshRun(seed: number, runLength: GameState['runLength'] = 'standard'): GameState {
  return startRun(seed, runLength)
}

export function tickTimes(state: GameState, days: number): GameState {
  let next = state
  for (let day = 0; day < days; day++) {
    next = step(next, { type: 'TICK' })
  }
  return next
}

/** Applies a list of actions in order, which is what a replay check compares. */
export function applyAll(state: GameState, actions: readonly Action[]): GameState {
  let next = state
  for (const action of actions) {
    next = step(next, action)
  }
  return next
}

/** Places a market buy and lets it fill on the following tick, as the engine requires. */
export function buyAndFill(state: GameState, amountUsd: number): GameState {
  const placed = step(state, {
    type: 'PLACE_ORDER',
    order: { side: 'buy', orderType: 'market', amountUsd },
  })
  return step(placed, { type: 'TICK' })
}

/** Places a market sell and lets it fill on the following tick. */
export function sellAndFill(state: GameState, qty: number): GameState {
  const placed = step(state, {
    type: 'PLACE_ORDER',
    order: { side: 'sell', orderType: 'market', qty },
  })
  return step(placed, { type: 'TICK' })
}

export function npcShares(state: GameState, npcId: string): number {
  return state.npcs.find((npc) => npc.id === npcId)?.shares ?? 0
}

export function totalLotQty(state: GameState): number {
  return state.lots.reduce((sum, lot) => sum + lot.qty, 0)
}
