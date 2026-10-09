import { err, ok, type Result, ValidationError } from '@dttm/types'
import { z } from 'zod'

/**
 * The rules for the one input this game takes: a trade. The trade sheet validates with these and
 * the composition that places the order parses with the same objects, so the form and the order
 * cannot come to disagree about what a valid trade is.
 *
 * A trade is sized as a percentage rather than as a share count on purpose: the price level is
 * hidden from the player, so a quantity would be a number they have no way to reason about.
 */

export const BUY_ORDER_TYPES = ['market', 'limit'] as const
export const SELL_ORDER_TYPES = ['market', 'stop', 'takeProfit'] as const

export type TradeSide = 'buy' | 'sell'
export type TradeOrderType = (typeof BUY_ORDER_TYPES)[number] | (typeof SELL_ORDER_TYPES)[number]

export const MIN_TRADE_PERCENT = 1
export const MAX_TRADE_PERCENT = 100

export const TradePercentSchema = z.coerce
  .number()
  .min(MIN_TRADE_PERCENT, `A trade has to be at least ${MIN_TRADE_PERCENT} percent`)
  .max(MAX_TRADE_PERCENT, `A trade cannot be more than ${MAX_TRADE_PERCENT} percent`)

export const TriggerPriceSchema = z.coerce.number().positive('A trigger price has to be above zero')

/** What the fields hold, which is text, because that is what somebody typed. */
export interface TradeFormValues {
  side: TradeSide
  orderType: TradeOrderType
  percent: string
  triggerPrice: string
}

/** A trade that parsed. Everything downstream takes this and never the raw fields. */
export interface TradeIntent {
  side: TradeSide
  orderType: TradeOrderType
  /** Percent of free cash to spend, or of the position to sell. */
  percent: number
  /** Present only for an order that waits for a price. */
  triggerPrice?: number
}

const ORDER_TYPES = [...BUY_ORDER_TYPES, ...SELL_ORDER_TYPES] as const

/** Narrows the value a select reports, so nothing downstream has to assert what it received. */
export function isTradeOrderType(value: string): value is TradeOrderType {
  return (ORDER_TYPES as readonly string[]).includes(value)
}

function firstMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'That is not a value this field accepts'
}

/**
 * Parses the fields into a trade, or says which one is wrong. It returns a result rather than
 * throwing because a half-typed form is a normal state of a form and not an exception.
 */
export function parseTradeForm(form: TradeFormValues): Result<TradeIntent, ValidationError> {
  const percent = TradePercentSchema.safeParse(form.percent)
  if (!percent.success) return err(new ValidationError(firstMessage(percent.error)))

  if (form.orderType === 'market') {
    return ok({ side: form.side, orderType: form.orderType, percent: percent.data })
  }

  const triggerPrice = TriggerPriceSchema.safeParse(form.triggerPrice)
  if (!triggerPrice.success) return err(new ValidationError(firstMessage(triggerPrice.error)))

  return ok({
    side: form.side,
    orderType: form.orderType,
    percent: percent.data,
    triggerPrice: triggerPrice.data,
  })
}
