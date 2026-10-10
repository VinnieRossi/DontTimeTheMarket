import { triggers } from './orders'
import {
  assetIn,
  elapsedDays,
  holdingIn,
  holdingValue,
  investedValue,
  portfolioValue,
  priceOf,
} from './portfolio-selectors'
import type { Holding, PortfolioRunState } from './portfolio-state'
import { REBALANCE_MIN_TRADE_USD, SHARE_EPSILON } from './rules'
import type { Lot, PendingOrder, TradeLogEntry } from './state'
import { consumeLots, feeFor, taxFor } from './trade-math'

/**
 * Buying, selling, and rebalancing a basket. Every figure a trade costs comes from `trade-math`,
 * the same module index-mode fills go through, so a company trade and an index trade pay the same
 * spread and the same tax on the same lot history.
 */

/** The cash a buy of `percent` of the player's cash on hand would spend. */
export function buyAmountForPercent(state: PortfolioRunState, percent: number): number {
  return state.cash * (percent / 100)
}

/** The shares a sell of `percent` of one holding would close. */
export function sellQtyForPercent(
  state: PortfolioRunState,
  assetId: string,
  percent: number
): number {
  return (holdingIn(state, assetId)?.shares ?? 0) * (percent / 100)
}

/**
 * Rescales every target so they total 100.
 *
 * Targets are what a rebalance aims at, so they have to add up: a set that totaled 90 would leave
 * a tenth of the money permanently in cash with nothing saying so. Holdings are added and removed
 * mid-run, and each time the rest keep their weights relative to each other and are stretched or
 * squeezed back onto 100. An empty set of targets splits evenly rather than dividing by zero.
 */
function normalizeTargets(holdings: readonly Holding[]): Holding[] {
  const total = holdings.reduce((sum, holding) => sum + holding.targetPct, 0)
  if (holdings.length === 0) return []
  if (total <= 0) {
    const even = 100 / holdings.length
    return holdings.map((holding) => ({ ...holding, targetPct: even }))
  }
  return holdings.map((holding) => ({ ...holding, targetPct: (holding.targetPct / total) * 100 }))
}

/**
 * A market buy of `amountUsd` worth of one company.
 *
 * Buying a company the portfolio does not hold yet opens a position in it, and the new holding's
 * target becomes the share of the invested money it has just become, with every other target
 * stretched back onto 100 around it. That is the rule a player can predict: a position you add
 * takes the weight you just gave it, and the ones you already had keep their weights relative to
 * each other.
 */
export function executeBuy(
  state: PortfolioRunState,
  assetId: string,
  amountUsd: number
): PortfolioRunState {
  if (assetIn(state.universe, assetId) === undefined) return state
  const price = priceOf(state, assetId)
  const fee = feeFor(amountUsd, state.settings)
  const spend = Math.min(amountUsd, state.cash)
  const net = spend - fee
  if (net <= 0) return state

  const qty = net / price
  const lot: Lot = { qty, cost: price, day: state.day }
  const existing = holdingIn(state, assetId)

  const holdings: Holding[] =
    existing === undefined
      ? [...state.holdings, { assetId, targetPct: 0, shares: qty, lots: [lot] }]
      : state.holdings.map((holding) =>
          holding.assetId === assetId
            ? { ...holding, shares: holding.shares + qty, lots: [...holding.lots, lot] }
            : holding
        )

  const logEntry: TradeLogEntry = { day: elapsedDays(state), price, side: 'buy', assetId }
  const bought: PortfolioRunState = {
    ...state,
    holdings,
    cash: state.cash - spend,
    feesPaid: state.feesPaid + fee,
    tradeCount: state.tradeCount + 1,
    tradeLog: [...state.tradeLog, logEntry],
  }

  if (existing !== undefined) return bought

  const invested = investedValue(bought)
  const opened = bought.holdings.map((holding) =>
    holding.assetId === assetId
      ? {
          ...holding,
          targetPct: invested > 0 ? (holdingValue(bought, holding) / invested) * 100 : 0,
        }
      : holding
  )
  return { ...bought, holdings: normalizeTargets(opened) }
}

/**
 * A market sell of `qtyToSell` shares of one company, taxed per lot by how long it was held.
 *
 * Selling a position down to nothing closes it: the holding is dropped and the remaining targets
 * are stretched back onto 100, so what is left keeps its relative weights and a later rebalance
 * puts the freed cash back to work rather than leaving it idle.
 */
export function executeSell(
  state: PortfolioRunState,
  assetId: string,
  qtyToSell: number
): PortfolioRunState {
  const holding = holdingIn(state, assetId)
  if (holding === undefined) return state
  const qty = Math.min(qtyToSell, holding.shares)
  if (qty <= 0) return state

  const price = priceOf(state, assetId)
  const { remainingLots, shortGain, longGain } = consumeLots(holding.lots, qty, price, state.day)
  const proceeds = qty * price
  const fee = feeFor(proceeds, state.settings)
  const tax = taxFor(shortGain, longGain, state.settings)
  const sharesLeft = holding.shares - qty

  const kept: Holding[] = []
  for (const current of state.holdings) {
    if (current.assetId !== assetId) {
      kept.push(current)
      continue
    }
    if (sharesLeft > SHARE_EPSILON) {
      kept.push({ ...current, shares: sharesLeft, lots: remainingLots })
    }
  }

  const logEntry: TradeLogEntry = { day: elapsedDays(state), price, side: 'sell', assetId }
  return {
    ...state,
    holdings: kept.length === state.holdings.length ? kept : normalizeTargets(kept),
    cash: state.cash + proceeds - fee - tax,
    feesPaid: state.feesPaid + fee,
    taxPaid: state.taxPaid + tax,
    tradeCount: state.tradeCount + 1,
    tradeLog: [...state.tradeLog, logEntry],
  }
}

/**
 * Runs every pending order against the current day's prices. Sells are filled before buys on
 * purpose: a rebalance pays for the companies it is topping up with the proceeds of the ones it
 * is trimming, and filling the buys first would make it fail for want of cash that arrives the
 * same day.
 */
export function processPendingOrders(state: PortfolioRunState): PortfolioRunState {
  const queued: PendingOrder[] = []
  const fillable: PendingOrder[] = []

  for (const order of state.pending) {
    const assetId = order.assetId
    if (assetId === undefined) continue
    const asset = assetIn(state.universe, assetId)
    if (asset === undefined) continue
    if (triggers(order, priceOf(state, assetId))) fillable.push(order)
    else queued.push(order)
  }

  let next = state
  for (const order of [
    ...fillable.filter((order) => order.side === 'sell'),
    ...fillable.filter((order) => order.side === 'buy'),
  ]) {
    const assetId = order.assetId ?? ''
    next =
      order.side === 'buy'
        ? executeBuy(next, assetId, order.amountUsd ?? 0)
        : executeSell(next, assetId, order.qty ?? 0)
  }

  return { ...next, pending: queued }
}

/**
 * Queues the trades that would put every holding back at its target share of the portfolio.
 *
 * It is not free, and that is the point: the orders it queues fill on the next day like any other
 * market order and pay the same spread and the same capital gains tax. Keeping a portfolio at its
 * target weights costs real investors money too, and a rebalance button that cost nothing would
 * have quietly lied about that.
 *
 * Anything already queued is replaced rather than added to, so tapping the button twice aims at
 * the portfolio once instead of trading toward the target and then past it.
 */
export function planRebalance(state: PortfolioRunState): PortfolioRunState {
  const total = portfolioValue(state)
  const orders: PendingOrder[] = []
  let nextOrderId = state.nextOrderId

  for (const holding of state.holdings) {
    const price = priceOf(state, holding.assetId)
    const difference = (holding.targetPct / 100) * total - holdingValue(state, holding)
    if (Math.abs(difference) < REBALANCE_MIN_TRADE_USD) continue
    orders.push(
      difference > 0
        ? {
            id: nextOrderId,
            side: 'buy',
            orderType: 'market',
            assetId: holding.assetId,
            amountUsd: difference,
          }
        : {
            id: nextOrderId,
            side: 'sell',
            orderType: 'market',
            assetId: holding.assetId,
            qty: -difference / price,
          }
    )
    nextOrderId += 1
  }

  return { ...state, pending: orders, nextOrderId }
}
