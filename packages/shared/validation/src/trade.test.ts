import { describe, expect, it } from 'vitest'
import {
  BUY_ORDER_TYPES,
  isTradeOrderType,
  MAX_TRADE_PERCENT,
  MIN_TRADE_PERCENT,
  parseTradeForm,
  SELL_ORDER_TYPES,
  type TradeFormValues,
} from './trade'

const MARKET_BUY: TradeFormValues = {
  side: 'buy',
  orderType: 'market',
  percent: '25',
  triggerPrice: '',
}

describe('parseTradeForm', () => {
  it('accepts a market order and leaves out the trigger price it does not use', () => {
    const parsed = parseTradeForm(MARKET_BUY)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value).toEqual({ side: 'buy', orderType: 'market', percent: 25 })
  })

  it('accepts the whole position, which is what panic selling looks like', () => {
    const parsed = parseTradeForm({ ...MARKET_BUY, side: 'sell', percent: '100' })
    expect(parsed.ok).toBe(true)
  })

  it('refuses a size below the floor or above the whole balance', () => {
    for (const percent of ['0', '0.5', '101', '-10']) {
      const parsed = parseTradeForm({ ...MARKET_BUY, percent })
      expect(parsed.ok, percent).toBe(false)
    }
  })

  it('refuses an empty or unreadable size rather than reading it as nothing', () => {
    for (const percent of ['', 'all of it']) {
      const parsed = parseTradeForm({ ...MARKET_BUY, percent })
      expect(parsed.ok, percent).toBe(false)
    }
  })

  it('names the bound it refused on, so the form can say which one', () => {
    const tooSmall = parseTradeForm({ ...MARKET_BUY, percent: '0' })
    const tooBig = parseTradeForm({ ...MARKET_BUY, percent: '200' })
    expect(tooSmall.ok || tooBig.ok).toBe(false)
    if (tooSmall.ok || tooBig.ok) return
    expect(tooSmall.error.message).toContain(String(MIN_TRADE_PERCENT))
    expect(tooBig.error.message).toContain(String(MAX_TRADE_PERCENT))
  })

  it('requires a trigger price for an order that waits for one', () => {
    const parsed = parseTradeForm({ ...MARKET_BUY, orderType: 'limit' })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error.message).toMatch(/trigger price/)
  })

  it('refuses a trigger price of zero or below, which no price can be', () => {
    for (const triggerPrice of ['0', '-5']) {
      const parsed = parseTradeForm({ ...MARKET_BUY, orderType: 'limit', triggerPrice })
      expect(parsed.ok, triggerPrice).toBe(false)
    }
  })

  it('accepts a trigger order once it has a price', () => {
    const parsed = parseTradeForm({
      side: 'sell',
      orderType: 'stop',
      percent: '50',
      triggerPrice: '91.5',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value).toEqual({
      side: 'sell',
      orderType: 'stop',
      percent: 50,
      triggerPrice: 91.5,
    })
  })
})

describe('isTradeOrderType', () => {
  it('recognizes every order type either side can place', () => {
    for (const orderType of [...BUY_ORDER_TYPES, ...SELL_ORDER_TYPES]) {
      expect(isTradeOrderType(orderType), orderType).toBe(true)
    }
  })

  it('rejects anything else, so a select cannot report a type the engine has no rule for', () => {
    expect(isTradeOrderType('trailing-stop')).toBe(false)
    expect(isTradeOrderType('')).toBe(false)
  })
})
