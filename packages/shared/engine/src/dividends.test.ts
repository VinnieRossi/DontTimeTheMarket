import { describe, expect, it } from 'vitest'
import { processDividends } from './dividends'
import { BOGLE_NPC_ID } from './npc'
import { DIVIDEND_PERIOD_DAYS } from './rules'
import { currentPrice } from './selectors'
import type { GameState } from './state'
import { freshRun, npcShares, totalLotQty } from './test-support'

/** A run positioned on a payment day, holding a position for the dividend to land on. */
function onPaymentDay(seed: number, overrides: Partial<GameState> = {}): GameState {
  const base = freshRun(seed)
  const day = base.day + (DIVIDEND_PERIOD_DAYS - (base.day % DIVIDEND_PERIOD_DAYS))
  const state: GameState = { ...base, day, ...overrides }
  return {
    ...state,
    shares: 10,
    lots: [{ qty: 10, cost: currentPrice(state), day: state.day }],
  }
}

describe('processDividends', () => {
  it('pays nothing on a day that is not a payment day', () => {
    const state = onPaymentDay(3)
    const offPeriod: GameState = { ...state, day: state.day + 1 }
    expect(processDividends(offPeriod)).toBe(offPeriod)
  })

  it('pays the player in cash by default', () => {
    const state = onPaymentDay(3)
    const after = processDividends(state)
    expect(after.cash).toBeGreaterThan(state.cash)
    expect(after.shares).toBe(state.shares)
  })

  it('buys more shares instead when the player opted into reinvesting', () => {
    const state = onPaymentDay(3)
    const opted: GameState = {
      ...state,
      settings: { ...state.settings, reinvestDividends: true },
    }
    const after = processDividends(opted)
    expect(after.cash).toBe(opted.cash)
    expect(after.shares).toBeGreaterThan(opted.shares)
    expect(totalLotQty(after)).toBeCloseTo(after.shares, 8)
  })

  it('withholds dividend tax when the tax switch is on', () => {
    const state = onPaymentDay(3)
    const untaxed: GameState = { ...state, settings: { ...state.settings, tax: false } }
    expect(processDividends(state).cash).toBeLessThan(processDividends(untaxed).cash)
  })

  it('reinvests for the benchmark always, since that discipline is the benchmark', () => {
    const state = onPaymentDay(3)
    const after = processDividends(state)
    expect(npcShares(after, BOGLE_NPC_ID)).toBeGreaterThan(npcShares(state, BOGLE_NPC_ID))
  })

  it('pays an NPC holding nothing nothing at all', () => {
    const state = onPaymentDay(3)
    const broke: GameState = {
      ...state,
      shares: 0,
      lots: [],
      npcs: state.npcs.map((npc) => ({ ...npc, shares: 0 })),
    }
    const after = processDividends(broke)
    expect(after.cash).toBe(broke.cash)
    expect(npcShares(after, BOGLE_NPC_ID)).toBe(0)
  })
})
