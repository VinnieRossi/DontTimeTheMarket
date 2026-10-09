import { currentPrice, elapsedDays } from "./selectors";
import {
  FEE_BPS,
  LONG_TERM_DAYS,
  TAX_LONG_RATE,
  TAX_SHORT_RATE,
  type GameState,
  type Lot,
  type TradeLogEntry,
} from "./types";

/** Executes a market buy of `amountUsd` worth of shares, returning a new
 * state. Pure: does not mutate `state`. */
export function executeBuy(state: GameState, amountUsd: number): GameState {
  const price = currentPrice(state);
  const fee = state.settings.fees ? amountUsd * (FEE_BPS / 10000) : 0;
  const spend = Math.min(amountUsd, state.cash);
  const net = spend - fee;
  if (net <= 0) return state;

  const qty = net / price;
  const newLot: Lot = { qty, cost: price, day: state.day };
  const tradeEntry: TradeLogEntry = {
    day: elapsedDays(state),
    price,
    side: "buy",
  };

  return {
    ...state,
    shares: state.shares + qty,
    cash: state.cash - spend,
    feesPaid: state.feesPaid + fee,
    lots: [...state.lots, newLot],
    tradeCount: state.tradeCount + 1,
    tradeLog: [...state.tradeLog, tradeEntry],
  };
}

/** Executes a market sell of `qtyToSell` shares using FIFO lot accounting
 * for short/long-term capital gains tax, returning a new state. Pure. */
export function executeSell(state: GameState, qtyToSell: number): GameState {
  const qty = Math.min(qtyToSell, state.shares);
  if (qty <= 0) return state;

  const price = currentPrice(state);
  let remaining = qty;
  let shortGain = 0;
  let longGain = 0;
  const lots: Lot[] = state.lots.map((lot) => ({ ...lot }));

  while (remaining > 1e-9 && lots.length > 0) {
    const lot = lots[0]!;
    const take = Math.min(lot.qty, remaining);
    const gain = (price - lot.cost) * take;
    const held = state.day - lot.day;
    if (held > LONG_TERM_DAYS) {
      longGain += gain;
    } else {
      shortGain += gain;
    }
    lot.qty -= take;
    remaining -= take;
    if (lot.qty <= 1e-9) lots.shift();
  }

  const proceeds = qty * price;
  const fee = state.settings.fees ? proceeds * (FEE_BPS / 10000) : 0;
  let tax = 0;
  if (state.settings.tax) {
    if (shortGain > 0) tax += shortGain * TAX_SHORT_RATE;
    if (longGain > 0) tax += longGain * TAX_LONG_RATE;
  }

  const tradeEntry: TradeLogEntry = {
    day: elapsedDays(state),
    price,
    side: "sell",
  };

  return {
    ...state,
    cash: state.cash + proceeds - fee - tax,
    shares: state.shares - qty,
    lots,
    feesPaid: state.feesPaid + fee,
    taxPaid: state.taxPaid + tax,
    tradeCount: state.tradeCount + 1,
    tradeLog: [...state.tradeLog, tradeEntry],
  };
}

/** Processes every pending order against the current day's price,
 * executing whichever ones trigger and keeping the rest queued. Market
 * orders always trigger on the next tick after they are placed, giving a
 * one-day settlement lag: a player reacts to yesterday's close by trading
 * at today's price, never at the exact price they were looking at when
 * they clicked. */
export function processPendingOrders(state: GameState): GameState {
  const price = currentPrice(state);
  let next = state;
  const keep: GameState["pending"] = [];

  for (const order of state.pending) {
    let trigger = false;
    if (order.orderType === "market") trigger = true;
    else if (order.orderType === "limit" && price <= (order.targetPrice ?? 0))
      trigger = true;
    else if (order.orderType === "stop" && price <= (order.targetPrice ?? 0))
      trigger = true;
    else if (
      order.orderType === "takeProfit" &&
      price >= (order.targetPrice ?? Infinity)
    )
      trigger = true;

    if (trigger) {
      if (order.side === "buy") {
        next = executeBuy(next, order.amountUsd ?? 0);
      } else {
        next = executeSell(next, order.qty ?? 0);
      }
    } else {
      keep.push(order);
    }
  }

  return { ...next, pending: keep };
}
