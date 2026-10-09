import { describe, expect, it } from 'vitest'
import { processInterest } from './interest'
import { IDLE_CASH_FALLBACK_APY } from './rules'
import type { GameState } from './state'
import { freshRun } from './test-support'

describe('processInterest', () => {
  it("pays the day's T-bill rate on idle cash", () => {
    const state = freshRun(13)
    const after = processInterest(state)
    expect(after.cash).toBeGreaterThan(state.cash)
    // One day of a plausible short rate: a few cents on ten thousand dollars, not dollars.
    expect(after.cash - state.cash).toBeLessThan(state.cash * 0.001)
  })

  it('pays nothing while the switch is off', () => {
    const state = freshRun(13)
    const off: GameState = { ...state, settings: { ...state.settings, interest: false } }
    expect(processInterest(off)).toBe(off)
  })

  it('pays nothing when there is no idle cash', () => {
    const state = freshRun(13)
    const invested: GameState = { ...state, cash: 0 }
    expect(processInterest(invested)).toBe(invested)
  })

  it('falls back to a flat rate on a day the rate series cannot answer for', () => {
    const state = freshRun(13)
    const offSeries: GameState = { ...state, cash: 10_000, day: -1 }
    const after = processInterest(offSeries)
    expect(after.cash).toBeCloseTo(10_000 * (1 + IDLE_CASH_FALLBACK_APY / 365), 10)
  })
})
