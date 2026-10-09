import { describe, expect, it } from 'vitest'
import { formatIsoDate, truncate } from './format'

describe('formatIsoDate', () => {
  it('renders a calendar date in UTC, zero-padded', () => {
    expect(formatIsoDate(new Date('2026-03-07T23:59:00.000Z'))).toBe('2026-03-07')
  })

  it('does not shift the date across a timezone boundary', () => {
    expect(formatIsoDate(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01')
  })
})

describe('truncate', () => {
  it('leaves a short string alone', () => {
    expect(truncate('short', 10)).toBe('short')
  })

  it('leaves a string of exactly the limit alone', () => {
    expect(truncate('exact', 5)).toBe('exact')
  })

  it('cuts at the limit and marks the cut', () => {
    expect(truncate('a longer sentence', 8)).toBe('a longer...')
  })

  it('does not leave trailing whitespace before the marker', () => {
    expect(truncate('a longer sentence', 9)).toBe('a longer...')
  })

  it('returns nothing for a non-positive limit', () => {
    expect(truncate('anything', 0)).toBe('')
  })
})
