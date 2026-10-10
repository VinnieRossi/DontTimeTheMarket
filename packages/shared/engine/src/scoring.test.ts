import { describe, expect, it } from 'vitest'
import { MIN_SCORING_DAYS, RUN_LENGTH_DAYS, STARTING_CASH, TRADING_DAYS_PER_YEAR } from './rules'
import {
  cagrOf,
  canCashOutAfter,
  edgeBpsOf,
  elapsedYearsOf,
  hasRoomAfter,
  runningGapPctOf,
  totalReturnPctOf,
} from './scoring'

describe('elapsedYearsOf', () => {
  it('counts a trading year as the trading days in one', () => {
    expect(elapsedYearsOf(TRADING_DAYS_PER_YEAR)).toBe(1)
  })

  it('never reports zero years, so nothing downstream divides by it', () => {
    expect(elapsedYearsOf(0)).toBeGreaterThan(0)
  })
})

describe('cagrOf', () => {
  it('is nothing for a run that ended where it started', () => {
    expect(cagrOf(STARTING_CASH, TRADING_DAYS_PER_YEAR)).toBeCloseTo(0, 9)
  })

  it('annualizes a gain, so doubling over a year beats doubling over ten', () => {
    const oneYear = cagrOf(STARTING_CASH * 2, TRADING_DAYS_PER_YEAR)
    const tenYears = cagrOf(STARTING_CASH * 2, TRADING_DAYS_PER_YEAR * 10)
    expect(oneYear).toBeCloseTo(1, 6)
    expect(tenYears).toBeLessThan(oneYear)
    expect(tenYears).toBeGreaterThan(0)
  })

  it('floors a wiped-out run rather than returning something unplottable', () => {
    expect(Number.isFinite(cagrOf(0, TRADING_DAYS_PER_YEAR))).toBe(true)
  })
})

describe('edgeBpsOf', () => {
  it('is zero when the player and the benchmark end level', () => {
    expect(edgeBpsOf(12_000, 12_000, 500)).toBeCloseTo(0, 9)
  })

  it('is positive for a player ahead and negative for one behind', () => {
    expect(edgeBpsOf(13_000, 12_000, 500)).toBeGreaterThan(0)
    expect(edgeBpsOf(11_000, 12_000, 500)).toBeLessThan(0)
  })

  it('reads the same for the same annualized gap over different run lengths', () => {
    const short = edgeBpsOf(STARTING_CASH * 1.2, STARTING_CASH * 1.1, TRADING_DAYS_PER_YEAR)
    const long = edgeBpsOf(
      STARTING_CASH * 1.2 ** 4,
      STARTING_CASH * 1.1 ** 4,
      TRADING_DAYS_PER_YEAR * 4
    )
    expect(long).toBeCloseTo(short, 4)
  })
})

describe('runningGapPctOf', () => {
  it('reports the plain percentage gap, which is safe to show mid-run', () => {
    expect(runningGapPctOf(11_000, 10_000)).toBeCloseTo(10, 9)
  })

  it('reports no gap against a benchmark that is worth nothing', () => {
    expect(runningGapPctOf(11_000, 0)).toBe(0)
  })
})

describe('totalReturnPctOf', () => {
  it('measures the plain gain or loss on the starting stake', () => {
    expect(totalReturnPctOf(STARTING_CASH * 1.5)).toBeCloseTo(50, 9)
    expect(totalReturnPctOf(STARTING_CASH / 2)).toBeCloseTo(-50, 9)
  })
})

describe('canCashOutAfter', () => {
  it('unlocks a score only once a run is long enough to mean anything', () => {
    expect(canCashOutAfter(MIN_SCORING_DAYS - 1)).toBe(false)
    expect(canCashOutAfter(MIN_SCORING_DAYS)).toBe(true)
  })
})

describe('hasRoomAfter', () => {
  it('has room while another full run length fits before the data ends', () => {
    expect(hasRoomAfter(0, 'short', RUN_LENGTH_DAYS.short + 100)).toBe(true)
  })

  it('has no room once the extension would read past the end of the series', () => {
    expect(hasRoomAfter(50, 'short', RUN_LENGTH_DAYS.short + 10)).toBe(false)
  })
})
