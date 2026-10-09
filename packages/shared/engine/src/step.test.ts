import { describe, expect, it } from 'vitest'
import { SERIES_LENGTH } from './market-data'
import { BOGLE_NPC_ID } from './npc'
import { DIVIDEND_PERIOD_DAYS, MIN_SCORING_DAYS, RUN_LENGTH_DAYS, STARTING_CASH } from './rules'
import { canCashOut, edgeBpsVs, elapsedDays, playerValue } from './selectors'
import type { Action, GameState } from './state'
import { startRun, step } from './step'
import { applyAll, buyAndFill, freshRun, npcShares, tickTimes, totalLotQty } from './test-support'

describe('starting a run', () => {
  it('opens with the full starting cash, no position, and no trades', () => {
    const state = freshRun(12345)
    expect(state.cash).toBe(STARTING_CASH)
    expect(state.shares).toBe(0)
    expect(state.tradeCount).toBe(0)
    expect(state.phase).toBe('running')
  })

  it('creates the benchmark fully invested at the same starting cash', () => {
    const state = freshRun(12345)
    expect(npcShares(state, BOGLE_NPC_ID)).toBeGreaterThan(0)
  })

  it('takes its run length from the length asked for', () => {
    expect(freshRun(1, 'short').horizonDays).toBe(RUN_LENGTH_DAYS.short)
    expect(freshRun(1, 'long').horizonDays).toBe(RUN_LENGTH_DAYS.long)
  })

  it('always picks the same start day for the same seed', () => {
    expect(freshRun(777).startDay).toBe(freshRun(777).startDay)
    expect(freshRun(777).rngState).toBe(freshRun(777).rngState)
  })

  it('picks different start days across seeds', () => {
    const starts = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => freshRun(seed).startDay))
    expect(starts.size).toBeGreaterThan(1)
  })

  it('can also be opened through the reducer, which is what a replay log does', () => {
    const viaAction = step(freshRun(5), { type: 'START_RUN', seed: 777, runLength: 'standard' })
    expect(viaAction).toEqual(startRun(777, 'standard'))
  })
})

describe('determinism', () => {
  const actions: readonly Action[] = [
    { type: 'TICK' },
    { type: 'TICK' },
    { type: 'PLACE_ORDER', order: { side: 'buy', orderType: 'market', amountUsd: 2000 } },
    { type: 'TICK' },
    { type: 'TICK' },
    { type: 'PLACE_ORDER', order: { side: 'sell', orderType: 'market', qty: 10 } },
    { type: 'TICK' },
  ]

  it('replaying the same actions from the same seed reaches an identical state', () => {
    expect(applyAll(freshRun(999), actions)).toEqual(applyAll(freshRun(999), actions))
  })

  it('never mutates the state it was handed', () => {
    const state = freshRun(999)
    const before = structuredClone(state)
    step(state, { type: 'TICK' })
    expect(state).toEqual(before)
  })
})

describe('a trading day', () => {
  it('fills a market order on the tick after it is placed, never at the price on screen', () => {
    const placed = step(freshRun(7), {
      type: 'PLACE_ORDER',
      order: { side: 'buy', orderType: 'market', amountUsd: 5000 },
    })
    expect(placed.shares).toBe(0)
    expect(placed.pending).toHaveLength(1)

    const filled = step(placed, { type: 'TICK' })
    expect(filled.shares).toBeGreaterThan(0)
    expect(filled.cash).toBeLessThan(STARTING_CASH)
    expect(filled.tradeLog.map((entry) => entry.side)).toEqual(['buy'])
  })

  it("records the day's value for the player and the benchmark", () => {
    const state = tickTimes(freshRun(7), 3)
    expect(state.valueHistory).toHaveLength(4)
    expect(state.valueHistory.at(-1)?.npcValues[BOGLE_NPC_ID]).toBeGreaterThan(0)
  })

  it('tracks the deepest drawdown as a negative number, or zero when there has been none', () => {
    const state = tickTimes(buyAndFill(freshRun(7), 10_000), 120)
    expect(state.maxDrawdownPct).toBeLessThanOrEqual(0)
    expect(state.peakValue).toBeGreaterThanOrEqual(playerValue(state))
  })

  it('cancels a pending order on request', () => {
    const placed = step(freshRun(7), {
      type: 'PLACE_ORDER',
      order: { side: 'buy', orderType: 'limit', amountUsd: 100, targetPrice: 1 },
    })
    const id = placed.pending[0]?.id ?? 0
    expect(step(placed, { type: 'CANCEL_ORDER', id }).pending).toHaveLength(0)
  })

  it('leaves a limit order queued while the price never reaches it', () => {
    const placed = step(freshRun(7), {
      type: 'PLACE_ORDER',
      order: { side: 'buy', orderType: 'limit', amountUsd: 1000, targetPrice: 0.01 },
    })
    const after = tickTimes(placed, 20)
    expect(after.pending).toHaveLength(1)
    expect(after.shares).toBe(0)
  })

  it('ends the run once the horizon is reached', () => {
    const state = tickTimes(freshRun(7, 'short'), RUN_LENGTH_DAYS.short)
    expect(state.phase).toBe('ended')
    expect(elapsedDays(state)).toBe(RUN_LENGTH_DAYS.short)
  })

  it('ignores a tick once the run has ended', () => {
    const ended = tickTimes(freshRun(7, 'short'), RUN_LENGTH_DAYS.short)
    expect(step(ended, { type: 'TICK' })).toBe(ended)
  })

  it('ends rather than reading past the end of the baked history', () => {
    const atTheEnd: GameState = { ...freshRun(7), day: SERIES_LENGTH - 1 }
    const after = step(atTheEnd, { type: 'TICK' })
    expect(after.phase).toBe('ended')
    expect(after.day).toBe(SERIES_LENGTH - 1)
  })
})

describe('switches', () => {
  it('changes the speed the clock outside the engine should tick at', () => {
    expect(step(freshRun(7), { type: 'SET_SPEED', speed: '16x' }).speed).toBe('16x')
  })

  it('turns a realism switch off mid-run', () => {
    const after = step(freshRun(7), { type: 'SET_SETTING', key: 'fees', value: false })
    expect(after.settings.fees).toBe(false)
    expect(after.settings.tax).toBe(true)
  })

  it('turns an indicator on mid-run', () => {
    const after = step(freshRun(7), { type: 'SET_INDICATOR', key: 'rsi', value: true })
    expect(after.indicators.rsi).toBe(true)
  })

  it('charges no fee on a buy once fees are off', () => {
    const base = freshRun(42)
    const withFees = buyAndFill(base, 5000)
    const withoutFees = buyAndFill(
      step(base, { type: 'SET_SETTING', key: 'fees', value: false }),
      5000
    )
    expect(withFees.feesPaid).toBeGreaterThan(0)
    expect(withoutFees.feesPaid).toBe(0)
    expect(withFees.shares).toBeLessThan(withoutFees.shares)
  })
})

describe('cashing out and continuing', () => {
  it('refuses to cash out before the minimum scoring sample', () => {
    const early = tickTimes(freshRun(11), MIN_SCORING_DAYS - 1)
    expect(canCashOut(early)).toBe(false)
    expect(step(early, { type: 'CASH_OUT' }).phase).toBe('running')
  })

  it('cashes out once the sample is long enough to score', () => {
    const scorable = tickTimes(freshRun(11), MIN_SCORING_DAYS)
    expect(canCashOut(scorable)).toBe(true)
    expect(step(scorable, { type: 'CASH_OUT' }).phase).toBe('ended')
  })

  it('does nothing on continue while the run is still going', () => {
    const state = freshRun(11)
    expect(step(state, { type: 'CONTINUE' })).toBe(state)
  })

  it('extends a finished run by another full length when the player is ahead', () => {
    const ended = step(tickTimes(freshRun(11), MIN_SCORING_DAYS), { type: 'CASH_OUT' })
    const ahead: GameState = {
      ...ended,
      cash: STARTING_CASH * 4,
      shares: 0,
    }
    expect(edgeBpsVs(ahead, BOGLE_NPC_ID)).toBeGreaterThan(0)
    const continued = step(ahead, { type: 'CONTINUE' })
    expect(continued.phase).toBe('running')
    expect(continued.horizonDays).toBe(ended.horizonDays + RUN_LENGTH_DAYS[ended.runLength])
  })

  it('refuses to continue a run the benchmark won', () => {
    const ended = step(tickTimes(freshRun(11), MIN_SCORING_DAYS), { type: 'CASH_OUT' })
    const behind: GameState = { ...ended, cash: 1, shares: 0 }
    const after = step(behind, { type: 'CONTINUE' })
    expect(after.phase).toBe('ended')
    expect(after.horizonDays).toBe(ended.horizonDays)
  })

  it('refuses to continue past the end of the baked history', () => {
    const ended = step(tickTimes(freshRun(11), MIN_SCORING_DAYS), { type: 'CASH_OUT' })
    const outOfRoom: GameState = {
      ...ended,
      cash: STARTING_CASH * 4,
      shares: 0,
      day: SERIES_LENGTH - 10,
    }
    expect(step(outOfRoom, { type: 'CONTINUE' }).phase).toBe('ended')
  })
})

describe('income', () => {
  it('keeps a lot for every reinvested dividend, so a later sell taxes its gain too', () => {
    const opted = step(freshRun(1), { type: 'SET_SETTING', key: 'reinvestDividends', value: true })
    const invested = buyAndFill(opted, 10_000)
    const sharesAfterBuy = invested.shares

    // Any run of a full dividend period is guaranteed to cross a payment day.
    const later = tickTimes(invested, DIVIDEND_PERIOD_DAYS + 1)
    expect(later.shares).toBeGreaterThan(sharesAfterBuy)
    expect(totalLotQty(later)).toBeCloseTo(later.shares, 6)

    const sold = step(later, {
      type: 'PLACE_ORDER',
      order: { side: 'sell', orderType: 'market', qty: later.shares },
    })
    const settled = step(sold, { type: 'TICK' })
    expect(settled.shares).toBeCloseTo(0, 6)
    expect(settled.lots).toHaveLength(0)
    expect(settled.taxPaid).toBeGreaterThan(0)
  })

  it('pays interest on cash that is never invested', () => {
    const idle = tickTimes(freshRun(1), 30)
    expect(idle.cash).toBeGreaterThan(STARTING_CASH)
    expect(idle.shares).toBe(0)
  })
})
