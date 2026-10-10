import { describe, expect, it } from 'vitest'
import {
  formatBasisPoints,
  formatMoney,
  formatPercent,
  formatShares,
  formatSignedPercent,
  formatSignedPoints,
  formatWholePercent,
} from './format'

describe('formatMoney', () => {
  it('groups thousands and drops the cents', () => {
    expect(formatMoney(10_604.42)).toBe('$10,604')
  })

  it('puts a loss in front of the symbol rather than after it', () => {
    expect(formatMoney(-1234.5)).toBe('-$1,235')
  })

  it('renders nothing left as zero rather than as an empty string', () => {
    expect(formatMoney(0)).toBe('$0')
  })
})

describe('formatSignedPercent', () => {
  it('says which way a gap went, including when it is exactly even', () => {
    expect(formatSignedPercent(2.44)).toBe('+2.4%')
    expect(formatSignedPercent(-6.09)).toBe('-6.1%')
    expect(formatSignedPercent(0)).toBe('+0.0%')
  })
})

describe('formatPercent', () => {
  it('adds no sign, for a figure that is not a comparison', () => {
    expect(formatPercent(18.44)).toBe('18.4%')
    expect(formatPercent(-12.1)).toBe('-12.1%')
  })
})

describe('formatBasisPoints', () => {
  it('rounds to whole points and keeps the sign', () => {
    expect(formatBasisPoints(183.6)).toBe('+184 bps')
    expect(formatBasisPoints(-202.6)).toBe('-203 bps')
    expect(formatBasisPoints(0)).toBe('+0 bps')
  })
})

describe('formatShares', () => {
  it('keeps two places, because a dollar-sized buy rarely lands on a whole share', () => {
    expect(formatShares(62.4149)).toBe('62.41')
    expect(formatShares(0)).toBe('0.00')
  })
})

describe('formatSignedPoints', () => {
  it('reads a gap between two percentages in points, with its sign', () => {
    expect(formatSignedPoints(8.04)).toBe('+8.0 pts')
    expect(formatSignedPoints(-4.02)).toBe('-4.0 pts')
    expect(formatSignedPoints(0)).toBe('+0.0 pts')
  })
})

describe('formatWholePercent', () => {
  it('rounds to a whole percentage, for a figure set in whole steps', () => {
    expect(formatWholePercent(33)).toBe('33%')
    expect(formatWholePercent(33.4)).toBe('33%')
    expect(formatWholePercent(0)).toBe('0%')
  })
})
