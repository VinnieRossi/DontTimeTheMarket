import { currentPrice, elapsedDays } from './selectors'
import type { GameState, Lot, PendingOrder, TradeLogEntry } from './state'
import { consumeLots, feeFor, taxFor } from './trade-math'

/** The cash a buy order of `percent` of the player's cash on hand would spend. */
export function buyAmountForPercent(state: { cash: number }, percent: number): number {
  return state.cash * (percent / 100)
}

/** The share count a sell order of `percent` of the player's position would close. */
export function sellQtyForPercent(state: { shares: number }, percent: number): number {
  return state.shares * (percent / 100)
}

/** A market buy of `amountUsd` worth of shares. Pure: it returns a new state and mutates nothing. */
export function executeBuy(state: GameState, amountUsd: number): GameState {
  const price = currentPrice(state)
  const fee = feeFor(amountUsd, state.settings)
  const spend = Math.min(amountUsd, state.cash)
  const net = spend - fee
  if (net <= 0) return state

  const qty = net / price
  const lot: Lot = { qty, cost: price, day: state.day }
  const logEntry: TradeLogEntry = { day: elapsedDays(state), price, side: 'buy' }

  return {
    ...state,
    shares: state.shares + qty,
    cash: state.cash - spend,
    feesPaid: state.feesPaid + fee,
    lots: [...state.lots, lot],
    tradeCount: state.tradeCount + 1,
    tradeLog: [...state.tradeLog, logEntry],
  }
}

/** A market sell of `qtyToSell` shares, taxed per lot by how long it was held. Pure. */
export function executeSell(state: GameState, qtyToSell: number): GameState {
  const qty = Math.min(qtyToSell, state.shares)
  if (qty <= 0) return state

  const price = currentPrice(state)
  const { remainingLots, shortGain, longGain } = consumeLots(state.lots, qty, price, state.day)

  const proceeds = qty * price
  const fee = feeFor(proceeds, state.settings)
  const tax = taxFor(shortGain, longGain, state.settings)

  const logEntry: TradeLogEntry = { day: elapsedDays(state), price, side: 'sell' }

  return {
    ...state,
    cash: state.cash + proceeds - fee - tax,
    shares: state.shares - qty,
    lots: remainingLots,
    feesPaid: state.feesPaid + fee,
    taxPaid: state.taxPaid + tax,
    tradeCount: state.tradeCount + 1,
    tradeLog: [...state.tradeLog, logEntry],
  }
}

/**
 * Whether an order fills at today's price. A market order always does on the tick after it was
 * placed, which is the one-day settlement lag; the rest wait for the price to reach their target.
 */
export function triggers(order: PendingOrder, price: number): boolean {
  switch (order.orderType) {
    case 'market':
      return true
    case 'limit':
    case 'stop':
      return price <= (order.targetPrice ?? 0)
    case 'takeProfit':
      return price >= (order.targetPrice ?? Number.POSITIVE_INFINITY)
  }
}

/**
 * Runs every pending order against the current day's price, executing whichever ones trigger and
 * keeping the rest queued. A market order always triggers on the next tick after it is placed,
 * which gives a one-day settlement lag: a player reacts to yesterday's close and trades at
 * today's price, never at the exact price they were looking at when they tapped.
 */
export function processPendingOrders(state: GameState): GameState {
  const price = currentPrice(state)
  let next = state
  const queued: PendingOrder[] = []

  for (const order of state.pending) {
    if (!triggers(order, price)) {
      queued.push(order)
      continue
    }
    next =
      order.side === 'buy'
        ? executeBuy(next, order.amountUsd ?? 0)
        : executeSell(next, order.qty ?? 0)
  }

  return { ...next, pending: queued }
}
