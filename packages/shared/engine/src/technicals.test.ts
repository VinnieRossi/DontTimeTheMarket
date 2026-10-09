import { describe, expect, it } from 'vitest'
import { closeAt } from './market-data'
import { approximateAtr, bollingerBands, sma } from './technicals'

const DAY = 500

describe('sma', () => {
  it('averages the window ending on the day asked for', () => {
    const period = 5
    let expected = 0
    for (let day = DAY - period + 1; day <= DAY; day++) {
      expected += closeAt(day)
    }
    expect(sma(DAY, period)).toBeCloseTo(expected / period, 8)
  })

  it('is null until the window has that much history behind it', () => {
    expect(sma(3, 5)).toBeNull()
    expect(sma(4, 5)).not.toBeNull()
  })
})

describe('bollingerBands', () => {
  it('centers on the moving average with the upper band above and the lower below', () => {
    const bands = bollingerBands(DAY)
    expect(bands).not.toBeNull()
    if (bands === null) return
    expect(bands.mid).toBeCloseTo(sma(DAY, 20) ?? 0, 8)
    expect(bands.upper).toBeGreaterThan(bands.mid)
    expect(bands.lower).toBeLessThan(bands.mid)
  })

  it('widens as the multiplier grows, which is the whole point of the band', () => {
    const narrow = bollingerBands(DAY, 20, 1)
    const wide = bollingerBands(DAY, 20, 3)
    expect(narrow).not.toBeNull()
    expect(wide).not.toBeNull()
    if (narrow === null || wide === null) return
    expect(wide.upper - wide.lower).toBeGreaterThan(narrow.upper - narrow.lower)
  })

  it('is null before there is a full window', () => {
    expect(bollingerBands(5)).toBeNull()
  })
})

describe('approximateAtr', () => {
  it('averages the absolute close-to-close move over the window', () => {
    const period = 4
    let expected = 0
    for (let day = DAY - period + 1; day <= DAY; day++) {
      expected += Math.abs(closeAt(day) - closeAt(day - 1))
    }
    expect(approximateAtr(DAY, period)).toBeCloseTo(expected / period, 8)
  })

  it('is never negative, since it measures distance rather than direction', () => {
    expect(approximateAtr(DAY) ?? -1).toBeGreaterThanOrEqual(0)
  })

  it('is null before the window plus the day it compares against exists', () => {
    expect(approximateAtr(14, 14)).not.toBeNull()
    expect(approximateAtr(13, 14)).toBeNull()
  })
})
