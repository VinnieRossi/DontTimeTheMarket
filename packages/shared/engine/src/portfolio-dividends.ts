import { assetIn, priceOf } from './portfolio-selectors'
import type { AssetSeries, BasketNpcState, Holding, PortfolioRunState } from './portfolio-state'
import { DIVIDEND_TAX_RATE } from './rules'
import type { Lot } from './state'

/**
 * Dividends in a portfolio run are the real ones: each company pays the amount it actually paid,
 * on the day it actually went ex-dividend, from the events baked alongside its prices. That is
 * the one place a portfolio run is more honest than an index run, which has to fall back on a
 * flat illustrative yield because no free source serves a per-day dividend yield for the index.
 *
 * Qualified-dividend tax applies to the player and to every benchmark equally when the tax switch
 * is on, since real investors cannot avoid dividend tax just by reinvesting. The player reinvests
 * only if they opted in; a benchmark always does, because that discipline is the entire point of
 * it.
 */

/** The per-share dividend a company paid on a day, or zero. */
function dividendOn(series: AssetSeries, day: number): number {
  const offset = day - series.firstDay
  for (const [eventOffset, amount] of series.dividends) {
    if (eventOffset === offset) return amount
    if (eventOffset > offset) break
  }
  return 0
}

/** What one holding is paid today, and what the holding looks like afterward. */
function payHolding(
  state: PortfolioRunState,
  holding: Holding,
  taxMultiplier: number
): { holding: Holding; cash: number } {
  const asset = assetIn(state.universe, holding.assetId)
  const perShare = asset === undefined ? 0 : dividendOn(asset.series, state.day)
  if (perShare <= 0 || holding.shares <= 0) return { holding, cash: 0 }

  const payout = perShare * holding.shares * taxMultiplier
  if (!state.settings.reinvestDividends) return { holding, cash: payout }

  const price = priceOf(state, holding.assetId)
  const qty = payout / price
  const reinvested: Lot = { qty, cost: price, day: state.day }
  return {
    holding: { ...holding, shares: holding.shares + qty, lots: [...holding.lots, reinvested] },
    cash: 0,
  }
}

/** A benchmark's basket after today's payments, reinvested across every company that paid. */
function payNpc(
  state: PortfolioRunState,
  npc: BasketNpcState,
  taxMultiplier: number
): BasketNpcState {
  const shares: Record<string, number> = { ...npc.shares }
  let changed = false
  for (const [assetId, held] of Object.entries(npc.shares)) {
    const asset = assetIn(state.universe, assetId)
    const perShare = asset === undefined ? 0 : dividendOn(asset.series, state.day)
    if (perShare <= 0 || held <= 0) continue
    const payout = perShare * held * taxMultiplier
    shares[assetId] = held + payout / priceOf(state, assetId)
    changed = true
  }
  return changed ? { ...npc, shares } : npc
}

export function processDividends(state: PortfolioRunState): PortfolioRunState {
  const taxMultiplier = state.settings.tax ? 1 - DIVIDEND_TAX_RATE : 1
  let cash = state.cash
  let paidAnything = false
  const holdings: Holding[] = []

  for (const holding of state.holdings) {
    const paid = payHolding(state, holding, taxMultiplier)
    if (paid.holding !== holding || paid.cash > 0) paidAnything = true
    cash += paid.cash
    holdings.push(paid.holding)
  }

  const npcs: BasketNpcState[] = []
  for (const npc of state.npcs) {
    const paid = payNpc(state, npc, taxMultiplier)
    if (paid !== npc) paidAnything = true
    npcs.push(paid)
  }

  if (!paidAnything) return state
  return { ...state, cash, holdings, npcs }
}
