import { describe, expect, it } from 'vitest'
import {
  closeAt,
  MAX_START_DAY,
  MIN_START_DAY,
  macro,
  macroAt,
  maybeCloseAt,
  nasdaq,
  SERIES_LENGTH,
} from './market-data'
import { RUN_LENGTH_DAYS } from './rules'

describe('the baked series', () => {
  it('carries one macro reading per trading day, so one day index addresses every series', () => {
    expect(nasdaq.dates).toHaveLength(SERIES_LENGTH)
    for (const [name, series] of Object.entries(macro)) {
      expect(series, name).toHaveLength(SERIES_LENGTH)
    }
  })

  it('holds no zero or negative close, which the simulation assumes throughout', () => {
    expect(nasdaq.close.every((price) => price > 0)).toBe(true)
  })

  it('leaves room after the latest start day for the longest run and one continue', () => {
    expect(MAX_START_DAY).toBeGreaterThan(MIN_START_DAY)
    expect(MAX_START_DAY + RUN_LENGTH_DAYS.long * 2).toBeLessThan(SERIES_LENGTH)
  })
})

describe('reading a day', () => {
  it('returns the close for a day inside the series', () => {
    expect(closeAt(MIN_START_DAY)).toBeGreaterThan(0)
  })

  it('throws for a day outside it, because a run can never produce such an index', () => {
    expect(() => closeAt(SERIES_LENGTH)).toThrow(/No price data/)
    expect(() => closeAt(-1)).toThrow(/No price data/)
  })

  it('answers undefined rather than throwing where a missing day is a real case', () => {
    expect(maybeCloseAt(SERIES_LENGTH)).toBeUndefined()
    expect(maybeCloseAt(MIN_START_DAY)).toBe(closeAt(MIN_START_DAY))
  })

  it('reports a baked null and an index past the end the same way', () => {
    expect(macroAt([1, null, 3], 1)).toBeUndefined()
    expect(macroAt([1, null, 3], 9)).toBeUndefined()
    expect(macroAt([1, null, 3], 2)).toBe(3)
  })
})
