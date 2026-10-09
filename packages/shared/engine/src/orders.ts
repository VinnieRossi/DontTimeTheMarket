import { FEE_BPS, LONG_TERM_DAYS, SHARE_EPSILON, TAX_LONG_RATE, TAX_SHORT_RATE } from './rules'
import { currentPrice, elapsedDays } from './selectors'
import type { GameState, Lot, PendingOrder, TradeLogEntry } from './state'

/** A market buy of `amountUsd` worth of shares. Pure: it returns a new state and mutates nothing. */
export function executeBuy(state: GameState, amountUsd: number): GameState {
  const price = currentPrice(state)
  const fee = state.settings.fees ? amountUsd * (FEE_BPS / 10000) : 0
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

interface LotConsumption {
  remainingLots: Lot[]
  shortGain: number
  longGain: number
}

/**
 * Takes `qty` shares off the oldest lots first. FIFO is what decides the tax: a lot held longer
 * than a year is taxed at the long-term rate, so which shares are sold is not a bookkeeping
 * detail but the difference between two tax bills.
 */
function consumeLots(state: GameState, qty: number, price: number): LotConsumption {
  const remainingLots: Lot[] = []
  let remaining = qty
  let shortGain = 0
  let longGain = 0

  for (const lot of state.lots) {
    if (remaining <= SHARE_EPSILON) {
      remainingLots.push({ ...lot })
      continue
    }
    const taken = Math.min(lot.qty, remaining)
    const gain = (price - lot.cost) * taken
    if (state.day - lot.day > LONG_TERM_DAYS) longGain += gain
    else shortGain += gain
    remaining -= taken
    const left = lot.qty - taken
    if (left > SHARE_EPSILON) remainingLots.push({ ...lot, qty: left })
  }

  return { remainingLots, shortGain, longGain }
}

/** A market sell of `qtyToSell` shares, taxed per lot by how long it was held. Pure. */
export function executeSell(state: GameState, qtyToSell: number): GameState {
  const qty = Math.min(qtyToSell, state.shares)
  if (qty <= 0) return state

  const price = currentPrice(state)
  const { remainingLots, shortGain, longGain } = consumeLots(state, qty, price)

  const proceeds = qty * price
  const fee = state.settings.fees ? proceeds * (FEE_BPS / 10000) : 0
  let tax = 0
  if (state.settings.tax) {
    if (shortGain > 0) tax += shortGain * TAX_SHORT_RATE
    if (longGain > 0) tax += longGain * TAX_LONG_RATE
  }

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

function triggers(order: PendingOrder, price: number): boolean {
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
