import { describe, expect, it } from 'vitest'
import { BOGLE_NPC_ID } from './npc'
import { LONG_TERM_DAYS, MIN_SCORING_DAYS, STARTING_CASH } from './rules'
import {
  cagr,
  canCashOut,
  currentPrice,
  edgeBpsVs,
  elapsedDays,
  elapsedYears,
  isLongTermLot,
  npcValue,
  playerValue,
  runningGapPctVs,
} from './selectors'
import { buyAndFill, freshRun, tickTimes } from './test-support'

describe('value', () => {
  it('is all cash before anything is bought', () => {
    expect(playerValue(freshRun(5))).toBe(STARTING_CASH)
  })

  it('counts the position at the current price once there is one', () => {
    const invested = buyAndFill(freshRun(5), 5000)
    expect(playerValue(invested)).toBeCloseTo(
      invested.cash + invested.shares * currentPrice(invested),
      8
    )
  })

  it('reads zero for an NPC nobody created, rather than throwing on the lookup', () => {
    expect(npcValue(freshRun(5), 'nobody')).toBe(0)
  })

  it('has the benchmark fully invested from day one', () => {
    const state = freshRun(5)
    expect(npcValue(state, BOGLE_NPC_ID)).toBeCloseTo(STARTING_CASH, 6)
  })
})

describe('elapsed time', () => {
  it("counts from the run's own start day, not from the series", () => {
    const state = tickTimes(freshRun(5), 10)
    expect(elapsedDays(state)).toBe(10)
  })

  it('never reports less than one day of elapsed years, so an early score has a divisor', () => {
    expect(elapsedYears(freshRun(5))).toBeGreaterThan(0)
  })
})

describe('scoring', () => {
  it('reports no growth for a run that is still worth its starting cash', () => {
    expect(cagr(freshRun(5), STARTING_CASH)).toBeCloseTo(0, 10)
  })

  it('reports growth above zero for a run worth more than it started with', () => {
    expect(cagr(tickTimes(freshRun(5), 252), STARTING_CASH * 2)).toBeGreaterThan(0)
  })

  it('shows no edge over the benchmark while both are untouched on day one', () => {
    expect(edgeBpsVs(freshRun(5), BOGLE_NPC_ID)).toBeCloseTo(0, 6)
    expect(runningGapPctVs(freshRun(5), BOGLE_NPC_ID)).toBeCloseTo(0, 6)
  })

  it('reports no gap against an NPC that does not exist rather than dividing by zero', () => {
    expect(runningGapPctVs(freshRun(5), 'nobody')).toBe(0)
  })
})

describe('gating', () => {
  it('refuses a score until the minimum sample has elapsed', () => {
    expect(canCashOut(tickTimes(freshRun(5), MIN_SCORING_DAYS - 1))).toBe(false)
    expect(canCashOut(tickTimes(freshRun(5), MIN_SCORING_DAYS))).toBe(true)
  })

  it('treats a lot as long term only once it is held past the threshold', () => {
    const state = freshRun(5)
    expect(isLongTermLot(state, state.day - LONG_TERM_DAYS)).toBe(false)
    expect(isLongTermLot(state, state.day - LONG_TERM_DAYS - 1)).toBe(true)
  })
})
