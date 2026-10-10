import { InternalError } from '@dttm/types'
import { SERIES_LENGTH } from './market-data'
import type { AssetSeries, Holding, PortfolioRunState, UniverseAsset } from './portfolio-state'
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

/** Every read a screen or a rule needs from a portfolio run, derived rather than stored. */

export function assetIn(
  universe: readonly UniverseAsset[],
  assetId: string
): UniverseAsset | undefined {
  return universe.find((asset) => asset.company.id === assetId)
}

/** A company's close price on a day, or undefined past either end of its own history. */
export function maybePriceAt(series: AssetSeries, day: number): number | undefined {
  return series.close[day - series.firstDay]
}

/**
 * A company's close price on a day. Throws rather than returning undefined: a run only ever
 * carries companies whose history covers the whole window it was drawn from, so a missing price
 * is a broken invariant rather than a case a screen should render.
 */
export function priceOf(state: PortfolioRunState, assetId: string, day = state.day): number {
  const asset = assetIn(state.universe, assetId)
  if (asset === undefined) throw new InternalError(`No company ${assetId} in this run`)
  const price = maybePriceAt(asset.series, day)
  if (price === undefined) {
    throw new InternalError(`No price for ${assetId} at day index ${day}`)
  }
  return price
}

export function holdingValue(state: PortfolioRunState, holding: Holding): number {
  return holding.shares * priceOf(state, holding.assetId)
}

/** What the player holds, at today's prices, with cash left out. */
export function investedValue(state: PortfolioRunState): number {
  return state.holdings.reduce((sum, holding) => sum + holdingValue(state, holding), 0)
}

export function portfolioValue(state: PortfolioRunState): number {
  return state.cash + investedValue(state)
}

export function npcValue(state: PortfolioRunState, npcId: string): number {
  const npc = state.npcs.find((candidate) => candidate.id === npcId)
  if (npc === undefined) return 0
  let value = npc.cash
  for (const [assetId, shares] of Object.entries(npc.shares)) {
    value += shares * priceOf(state, assetId)
  }
  return value
}

export function elapsedDays(state: PortfolioRunState): number {
  return state.day - state.startDay
}

export function elapsedYears(state: PortfolioRunState): number {
  return elapsedYearsOf(elapsedDays(state))
}

export function cagr(state: PortfolioRunState, value: number): number {
  return cagrOf(value, elapsedDays(state))
}

export function edgeBpsVs(state: PortfolioRunState, npcId: string): number {
  return edgeBpsOf(portfolioValue(state), npcValue(state, npcId), elapsedDays(state))
}

export function runningGapPctVs(state: PortfolioRunState, npcId: string): number {
  return runningGapPctOf(portfolioValue(state), npcValue(state, npcId))
}

export function canCashOut(state: PortfolioRunState): boolean {
  return canCashOutAfter(elapsedDays(state))
}

export function hasRoomToContinue(state: PortfolioRunState): boolean {
  return hasRoomAfter(state.day, state.runLength, SERIES_LENGTH)
}

export function totalReturnPct(state: PortfolioRunState): number {
  return totalReturnPctOf(portfolioValue(state))
}

/** What share of the whole portfolio, cash included, a holding is worth right now. */
export function weightPctOf(state: PortfolioRunState, holding: Holding): number {
  const total = portfolioValue(state)
  if (total <= 0) return 0
  return (holdingValue(state, holding) / total) * 100
}

export function holdingIn(state: PortfolioRunState, assetId: string): Holding | undefined {
  return state.holdings.find((holding) => holding.assetId === assetId)
}

export function isLongTermLot(state: PortfolioRunState, lotDay: number): boolean {
  return state.day - lotDay > LONG_TERM_DAYS
}

/**
 * The portfolio's own value on a day, read back from what the run recorded. It is what the
 * window-based indicators smooth in a portfolio run, since there is no single market price to
 * smooth instead, and it has nothing to say about a day before the run opened.
 */
export function recordedValueAt(state: PortfolioRunState, day: number): number | undefined {
  // One entry is recorded when the run opens and exactly one more on every tick, so the day
  // offset is the index. Addressing it directly rather than searching matters: a moving average
  // over a long window asks this thousands of times for one frame.
  const entry = state.valueHistory[day - state.startDay]
  return entry?.day === day ? entry.playerValue : undefined
}
