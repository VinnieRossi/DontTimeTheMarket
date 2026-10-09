import { describe, expect, it } from 'vitest'
import { executeBuy, executeSell, processPendingOrders } from './orders'
import { FEE_BPS, LONG_TERM_DAYS, STARTING_CASH } from './rules'
import { currentPrice } from './selectors'
import type { GameState } from './state'
import { freshRun, totalLotQty } from './test-support'

function withSettings(state: GameState, settings: Partial<GameState['settings']>): GameState {
  return { ...state, settings: { ...state.settings, ...settings } }
}

describe('executeBuy', () => {
  it('spends the cash, records the lot, and logs the trade', () => {
    const state = withSettings(freshRun(21), { fees: false })
    const after = executeBuy(state, 4000)
    expect(after.cash).toBeCloseTo(STARTING_CASH - 4000, 8)
    expect(after.shares).toBeCloseTo(4000 / currentPrice(state), 8)
    expect(totalLotQty(after)).toBeCloseTo(after.shares, 10)
    expect(after.tradeLog).toEqual([{ day: 0, price: currentPrice(state), side: 'buy' }])
  })

  it('charges the fee out of the amount, so fewer shares arrive', () => {
    const state = freshRun(21)
    const withFee = executeBuy(state, 4000)
    const withoutFee = executeBuy(withSettings(state, { fees: false }), 4000)
    expect(withFee.feesPaid).toBeCloseTo(4000 * (FEE_BPS / 10000), 10)
    expect(withFee.shares).toBeLessThan(withoutFee.shares)
  })

  it('never spends more than the cash on hand', () => {
    const after = executeBuy(withSettings(freshRun(21), { fees: false }), STARTING_CASH * 10)
    expect(after.cash).toBeCloseTo(0, 8)
  })

  it('does nothing when the fee would swallow the whole order', () => {
    const state = freshRun(21)
    expect(executeBuy(state, 0)).toBe(state)
  })
})

describe('executeSell', () => {
  it('returns the state untouched when there is nothing to sell', () => {
    const state = freshRun(21)
    expect(executeSell(state, 5)).toBe(state)
  })

  it('closes the position and empties the lot list on a full sell', () => {
    const invested = executeBuy(withSettings(freshRun(21), { fees: false, tax: false }), 5000)
    const after = executeSell(invested, invested.shares)
    expect(after.shares).toBeCloseTo(0, 10)
    expect(after.lots).toHaveLength(0)
    expect(after.cash).toBeCloseTo(STARTING_CASH, 6)
  })

  it('sells no more than the position, however much is asked for', () => {
    const invested = executeBuy(withSettings(freshRun(21), { fees: false, tax: false }), 5000)
    const after = executeSell(invested, invested.shares * 10)
    expect(after.shares).toBeCloseTo(0, 10)
  })

  it('takes the oldest lot first, which is what decides the tax rate', () => {
    const base = withSettings(freshRun(21), { fees: false, tax: true })
    const price = currentPrice(base)
    const held: GameState = {
      ...base,
      shares: 2,
      lots: [
        { qty: 1, cost: price / 2, day: base.day - LONG_TERM_DAYS - 10 },
        { qty: 1, cost: price / 2, day: base.day },
      ],
    }

    const soldOne = executeSell(held, 1)
    expect(soldOne.lots).toHaveLength(1)
    expect(soldOne.lots[0]?.day).toBe(base.day)

    const longTermTax = soldOne.taxPaid
    const bothSold = executeSell(held, 2)
    expect(bothSold.taxPaid).toBeGreaterThan(longTermTax * 2)
  })

  it('charges no tax on a loss', () => {
    const base = withSettings(freshRun(21), { fees: false, tax: true })
    const price = currentPrice(base)
    const held: GameState = {
      ...base,
      shares: 1,
      lots: [{ qty: 1, cost: price * 2, day: base.day }],
    }
    expect(executeSell(held, 1).taxPaid).toBe(0)
  })

  it('leaves the remainder of a partly consumed lot behind', () => {
    const base = withSettings(freshRun(21), { fees: false, tax: false })
    const held: GameState = {
      ...base,
      shares: 4,
      lots: [{ qty: 4, cost: currentPrice(base), day: base.day }],
    }
    const after = executeSell(held, 1.5)
    expect(after.lots).toHaveLength(1)
    expect(after.lots[0]?.qty).toBeCloseTo(2.5, 10)
  })
})

describe('processPendingOrders', () => {
  it('fills a market order and clears it from the queue', () => {
    const state = freshRun(21)
    const queued: GameState = {
      ...state,
      pending: [{ id: 1, side: 'buy', orderType: 'market', amountUsd: 1000 }],
    }
    const after = processPendingOrders(queued)
    expect(after.pending).toHaveLength(0)
    expect(after.shares).toBeGreaterThan(0)
  })

  it('keeps a limit buy queued until the price falls to the target', () => {
    const state = freshRun(21)
    const price = currentPrice(state)
    const queued: GameState = {
      ...state,
      pending: [
        { id: 1, side: 'buy', orderType: 'limit', amountUsd: 1000, targetPrice: price / 2 },
        { id: 2, side: 'buy', orderType: 'limit', amountUsd: 1000, targetPrice: price * 2 },
      ],
    }
    const after = processPendingOrders(queued)
    expect(after.pending.map((order) => order.id)).toEqual([1])
  })

  it('fires a stop-loss when the price is at or below its trigger', () => {
    const state = freshRun(21)
    const price = currentPrice(state)
    const held: GameState = {
      ...state,
      shares: 1,
      lots: [{ qty: 1, cost: price, day: state.day }],
      pending: [{ id: 1, side: 'sell', orderType: 'stop', qty: 1, targetPrice: price * 2 }],
    }
    const after = processPendingOrders(held)
    expect(after.pending).toHaveLength(0)
    expect(after.shares).toBeCloseTo(0, 10)
  })

  it('fires a take-profit when the price is at or above its trigger', () => {
    const state = freshRun(21)
    const price = currentPrice(state)
    const held: GameState = {
      ...state,
      shares: 1,
      lots: [{ qty: 1, cost: price, day: state.day }],
      pending: [
        { id: 1, side: 'sell', orderType: 'takeProfit', qty: 1, targetPrice: price / 2 },
        { id: 2, side: 'sell', orderType: 'takeProfit', qty: 1, targetPrice: price * 2 },
      ],
    }
    const after = processPendingOrders(held)
    expect(after.pending.map((order) => order.id)).toEqual([2])
  })

  it('treats a trigger order with no price as unfillable rather than firing it blind', () => {
    const state = freshRun(21)
    const queued: GameState = {
      ...state,
      pending: [{ id: 1, side: 'buy', orderType: 'limit', amountUsd: 1000 }],
    }
    expect(processPendingOrders(queued).pending).toHaveLength(1)
  })
})
