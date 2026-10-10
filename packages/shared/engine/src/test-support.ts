import { splitEvenly } from './allocations'
import type { Allocation, PortfolioRunState } from './portfolio-state'
import type { RunLength } from './rules'
import type { Action, GameState, OrderSide, PendingOrder } from './state'
import { startRun, step } from './step'
import { browseRoster, startPortfolioRun } from './stocks'

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

/**
 * Opens a portfolio run over the committed roster, from an explicit seed and an explicit number
 * of evenly split companies. Both are named by the caller for the same reason an index run's seed
 * is: a portfolio nobody wrote down is a failure nobody can reproduce.
 */
export function freshPortfolioRun(
  seed: number,
  holdingCount = 3,
  runLength: RunLength = 'standard'
): PortfolioRunState {
  const browse = browseRoster(seed)
  const picks: Allocation[] = browse
    .slice(0, holdingCount)
    .map((company) => ({ assetId: company.id, percent: 0 }))
  return startPortfolioRun(seed, runLength, splitEvenly(picks))
}

export function tickPortfolio(state: PortfolioRunState, days: number): PortfolioRunState {
  let next = state
  for (let day = 0; day < days; day++) {
    next = step(next, { type: 'TICK' })
  }
  return next
}

/**
 * A market order as a test writes one: the company and the size can be read straight off a
 * holding that the type checker only knows might be there, and the fields that came back
 * undefined are dropped rather than passed on as explicit undefined.
 */
export interface TestOrder {
  side: OrderSide
  assetId?: string | undefined
  amountUsd?: number | undefined
  qty?: number | undefined
}

/** Places a market order on one company and lets it fill on the following tick. */
export function orderAndFill(state: PortfolioRunState, order: TestOrder): PortfolioRunState {
  const placed: Omit<PendingOrder, 'id'> = {
    side: order.side,
    orderType: 'market',
    ...(order.assetId === undefined ? {} : { assetId: order.assetId }),
    ...(order.amountUsd === undefined ? {} : { amountUsd: order.amountUsd }),
    ...(order.qty === undefined ? {} : { qty: order.qty }),
  }
  return step(step(state, { type: 'PLACE_ORDER', order: placed }), { type: 'TICK' })
}

export function targetTotal(state: PortfolioRunState): number {
  return state.holdings.reduce((sum, holding) => sum + holding.targetPct, 0)
}
