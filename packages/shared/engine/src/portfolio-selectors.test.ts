import { InternalError } from '@dttm/types'
import { describe, expect, it } from 'vitest'
import { externalCloseAt } from './external-npcs'
import { SERIES_LENGTH } from './market-data'
import { BOGLE_NPC_ID } from './npc'
import {
  assetIn,
  cagr,
  canCashOut,
  edgeBpsVs,
  elapsedDays,
  elapsedYears,
  hasRoomToContinue,
  holdingIn,
  holdingValue,
  investedValue,
  isLongTermLot,
  maybePriceAt,
  npcValue,
  portfolioValue,
  priceOf,
  recordedValueAt,
  runningGapPctVs,
  totalReturnPct,
  weightPctOf,
} from './portfolio-selectors'
import { LONG_TERM_DAYS, MIN_SCORING_DAYS, STARTING_CASH, TRADING_DAYS_PER_YEAR } from './rules'
import { freshPortfolioRun, tickPortfolio } from './test-support'

const SEED = 525_252

describe('reading a company out of a run', () => {
  it('finds a company the run carries and nothing for one it does not', () => {
    const run = freshPortfolioRun(SEED, 3)
    const held = run.holdings[0]?.assetId ?? ''
    expect(assetIn(run.universe, held)?.company.id).toBe(held)
    expect(assetIn(run.universe, 'NOT-A-COMPANY')).toBeUndefined()
  })

  it('answers with a price on every day of the window and nothing past its ends', () => {
    const run = freshPortfolioRun(SEED, 2)
    const series = run.universe[0]?.series
    if (series === undefined) throw new Error('the run carries no companies')
    expect(maybePriceAt(series, run.startDay)).toBeGreaterThan(0)
    expect(maybePriceAt(series, series.firstDay - 1)).toBeUndefined()
    expect(maybePriceAt(series, SERIES_LENGTH + 1)).toBeUndefined()
  })

  it('treats a missing price as a broken invariant rather than something to render', () => {
    const run = freshPortfolioRun(SEED, 2)
    expect(() => priceOf(run, 'NOT-A-COMPANY')).toThrow(InternalError)
    expect(() => priceOf(run, run.holdings[0]?.assetId ?? '', -5)).toThrow(InternalError)
  })
})

describe('what a portfolio is worth', () => {
  it('values a holding at today’s price, and the portfolio as the holdings plus cash', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 40)
    const summed = run.holdings.reduce((total, holding) => total + holdingValue(run, holding), 0)
    expect(investedValue(run)).toBeCloseTo(summed, 6)
    expect(portfolioValue(run)).toBeCloseTo(summed + run.cash, 6)
  })

  it('values the benchmark the same way, across every company it bought on day one', () => {
    const run = freshPortfolioRun(SEED, 3)
    expect(npcValue(run, BOGLE_NPC_ID)).toBeCloseTo(STARTING_CASH, 6)
    expect(npcValue(run, 'nobody')).toBe(0)
  })

  it('reports a holding’s weight against the whole portfolio, cash included', () => {
    const run = freshPortfolioRun(SEED, 4)
    const weights = run.holdings.map((holding) => weightPctOf(run, holding))
    expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(100, 4)
  })

  it('reports no weight at all for a portfolio that is worth nothing', () => {
    const run = freshPortfolioRun(SEED, 2)
    const holding = run.holdings[0]
    if (holding === undefined) throw new Error('the run opened with no holdings')
    const empty = {
      ...run,
      cash: 0,
      holdings: run.holdings.map((current) => ({ ...current, shares: 0 })),
    }
    expect(weightPctOf(empty, { ...holding, shares: 0 })).toBe(0)
  })

  it('finds a holding by company and nothing for one that was never bought', () => {
    const run = freshPortfolioRun(SEED, 2)
    expect(holdingIn(run, run.holdings[0]?.assetId ?? '')).toBe(run.holdings[0])
    expect(holdingIn(run, 'NOT-HELD')).toBeUndefined()
  })
})

describe('how far along a run is', () => {
  it('counts elapsed days from the day the run opened', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 2), 15)
    expect(elapsedDays(run)).toBe(15)
    expect(elapsedYears(run)).toBeCloseTo(15 / TRADING_DAYS_PER_YEAR, 9)
  })

  it('unlocks a score only once the run is long enough to mean anything', () => {
    expect(canCashOut(tickPortfolio(freshPortfolioRun(SEED, 2), MIN_SCORING_DAYS - 1))).toBe(false)
    expect(canCashOut(tickPortfolio(freshPortfolioRun(SEED, 2), MIN_SCORING_DAYS))).toBe(true)
  })

  it('reads a lot as long-term only after it has been held past a year', () => {
    const run = freshPortfolioRun(SEED, 2)
    expect(isLongTermLot(run, run.startDay)).toBe(false)
    expect(isLongTermLot({ ...run, day: run.startDay + LONG_TERM_DAYS + 1 }, run.startDay)).toBe(
      true
    )
  })

  it('has no room to continue once the extension would run past the end of the data', () => {
    const run = freshPortfolioRun(SEED, 2, 'long')
    expect(hasRoomToContinue({ ...run, day: SERIES_LENGTH - 10 })).toBe(false)
  })
})

describe('scoring a portfolio run', () => {
  it('opens level with the benchmark, because both bought the same basket', () => {
    const run = freshPortfolioRun(SEED, 3)
    expect(edgeBpsVs(run, BOGLE_NPC_ID)).toBeCloseTo(0, 6)
    expect(runningGapPctVs(run, BOGLE_NPC_ID)).toBeCloseTo(0, 6)
    expect(totalReturnPct(run)).toBeCloseTo(0, 6)
    expect(cagr(run, STARTING_CASH)).toBeCloseTo(0, 6)
  })

  it('reports no gap against a benchmark that is not in the run', () => {
    const run = freshPortfolioRun(SEED, 2)
    expect(runningGapPctVs(run, 'nobody')).toBe(0)
  })
})

describe('the external benchmark NPCs', () => {
  it('starts all three fully invested, since a portfolio run always opens after 1999', () => {
    const run = freshPortfolioRun(SEED, 3)
    expect(run.externalNpcs.map((npc) => npc.id).sort()).toEqual([
      'berkshire',
      'nasdaq100',
      'sp500',
    ])
    expect(npcValue(run, 'sp500')).toBeCloseTo(STARTING_CASH, 6)
    expect(npcValue(run, 'nasdaq100')).toBeCloseTo(STARTING_CASH, 6)
    expect(npcValue(run, 'berkshire')).toBeCloseTo(STARTING_CASH, 6)
  })

  it('values an external NPC through the same generalized selector the basket benchmark uses', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 40)
    const npc = run.externalNpcs.find((candidate) => candidate.id === 'sp500')
    if (npc === undefined) throw new Error('expected the S&P 500 NPC')
    const price = externalCloseAt('sp500', run.day)
    expect(npcValue(run, 'sp500')).toBeCloseTo(npc.cash + npc.shares * (price ?? 0), 6)
  })
})

describe('the value line a portfolio charts', () => {
  it('reads back the value recorded for a day, and nothing for a day it never saw', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 20)
    expect(recordedValueAt(run, run.startDay)).toBeCloseTo(STARTING_CASH, 6)
    expect(recordedValueAt(run, run.day)).toBeCloseTo(portfolioValue(run), 6)
    expect(recordedValueAt(run, run.startDay - 1)).toBeUndefined()
    expect(recordedValueAt(run, run.day + 1)).toBeUndefined()
  })
})
