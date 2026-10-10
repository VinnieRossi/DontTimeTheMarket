import { describe, expect, it } from 'vitest'
import { FEE_BPS, LONG_TERM_DAYS, TAX_LONG_RATE, TAX_SHORT_RATE } from './rules'
import { DEFAULT_SETTINGS } from './settings'
import type { Lot } from './state'
import { advanceDrawdown, consumeLots, feeFor, taxFor } from './trade-math'

const OFF = { ...DEFAULT_SETTINGS, fees: false, tax: false }

describe('feeFor', () => {
  it('charges the spread as a basis-point haircut on what was traded', () => {
    expect(feeFor(10_000, DEFAULT_SETTINGS)).toBeCloseTo(10_000 * (FEE_BPS / 10_000), 9)
  })

  it('charges nothing while the switch is off', () => {
    expect(feeFor(10_000, OFF)).toBe(0)
  })
})

describe('consumeLots', () => {
  const lots: Lot[] = [
    { qty: 10, cost: 100, day: 0 },
    { qty: 10, cost: 200, day: 1_000 },
  ]

  it('takes the oldest shares first, which is what decides the tax', () => {
    const { remainingLots, shortGain, longGain } = consumeLots(lots, 10, 300, 1_010)
    expect(remainingLots).toEqual([{ qty: 10, cost: 200, day: 1_000 }])
    expect(longGain).toBeCloseTo((300 - 100) * 10, 9)
    expect(shortGain).toBe(0)
  })

  it('splits a lot it only partly consumes', () => {
    const { remainingLots } = consumeLots(lots, 4, 300, 1_010)
    expect(remainingLots).toEqual([
      { qty: 6, cost: 100, day: 0 },
      { qty: 10, cost: 200, day: 1_000 },
    ])
  })

  it('reads a lot held past a year as long-term and a newer one as short-term', () => {
    const sameDay: Lot[] = [{ qty: 10, cost: 100, day: 500 }]
    const short = consumeLots(sameDay, 10, 150, 500 + LONG_TERM_DAYS)
    const long = consumeLots(sameDay, 10, 150, 500 + LONG_TERM_DAYS + 1)
    expect(short.shortGain).toBeCloseTo(500, 9)
    expect(short.longGain).toBe(0)
    expect(long.longGain).toBeCloseTo(500, 9)
    expect(long.shortGain).toBe(0)
  })

  it('reports a loss as a negative gain rather than hiding it', () => {
    const { shortGain } = consumeLots([{ qty: 5, cost: 100, day: 10 }], 5, 60, 20)
    expect(shortGain).toBeCloseTo(-200, 9)
  })

  it('leaves no float dust behind when a lot is consumed exactly', () => {
    expect(consumeLots([{ qty: 7, cost: 10, day: 0 }], 7, 12, 5).remainingLots).toEqual([])
  })
})

describe('taxFor', () => {
  it('taxes a short-term gain harder than a long-term one', () => {
    expect(taxFor(1_000, 0, DEFAULT_SETTINGS)).toBeCloseTo(1_000 * TAX_SHORT_RATE, 9)
    expect(taxFor(0, 1_000, DEFAULT_SETTINGS)).toBeCloseTo(1_000 * TAX_LONG_RATE, 9)
  })

  it('taxes a loss at nothing, since there is no gain to tax', () => {
    expect(taxFor(-500, -500, DEFAULT_SETTINGS)).toBe(0)
  })

  it('charges nothing while the switch is off', () => {
    expect(taxFor(1_000, 1_000, OFF)).toBe(0)
  })
})

describe('advanceDrawdown', () => {
  it('raises the peak when a run reaches a new high and reports no drawdown there', () => {
    expect(advanceDrawdown({ peakValue: 100, maxDrawdownPct: 0 }, 150)).toEqual({
      peakValue: 150,
      maxDrawdownPct: 0,
    })
  })

  it('measures a fall from the peak, not from where the run started', () => {
    const after = advanceDrawdown({ peakValue: 200, maxDrawdownPct: 0 }, 150)
    expect(after.peakValue).toBe(200)
    expect(after.maxDrawdownPct).toBeCloseTo(-0.25, 9)
  })

  it('keeps the worst drawdown a run ever sat in, not the current one', () => {
    const worst = advanceDrawdown({ peakValue: 200, maxDrawdownPct: -0.4 }, 190)
    expect(worst.maxDrawdownPct).toBeCloseTo(-0.4, 9)
  })
})
