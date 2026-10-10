import { describe, expect, it } from 'vitest'
import {
  allocationTotal,
  isAllocationComplete,
  splitEvenly,
  stepAllocation,
  TOTAL_PCT,
  toggleAllocation,
} from './allocations'
import type { Allocation } from './portfolio-state'
import { MAX_HOLDINGS } from './rules'

function draft(...assetIds: string[]): Allocation[] {
  return splitEvenly(assetIds.map((assetId) => ({ assetId, percent: 0 })))
}

describe('splitEvenly', () => {
  it('gives every company the same share when the share divides evenly', () => {
    expect(splitEvenly(draft('A', 'B', 'C', 'D'))).toEqual([
      { assetId: 'A', percent: 25 },
      { assetId: 'B', percent: 25 },
      { assetId: 'C', percent: 25 },
      { assetId: 'D', percent: 25 },
    ])
  })

  it('still totals exactly 100 when the share does not divide evenly', () => {
    const three = splitEvenly(draft('A', 'B', 'C'))
    expect(allocationTotal(three)).toBe(TOTAL_PCT)
    expect(three.map((allocation) => allocation.percent)).toEqual([34, 33, 33])
  })

  it('leaves an empty draft empty rather than inventing a holding', () => {
    expect(splitEvenly([])).toEqual([])
  })
})

describe('toggleAllocation', () => {
  it('adds a company and re-splits, so the total is never left broken', () => {
    const after = toggleAllocation(draft('A'), 'B')
    expect(after.map((allocation) => allocation.assetId)).toEqual(['A', 'B'])
    expect(allocationTotal(after)).toBe(TOTAL_PCT)
  })

  it('drops a company already in the draft and re-splits what is left', () => {
    const after = toggleAllocation(draft('A', 'B', 'C'), 'B')
    expect(after.map((allocation) => allocation.assetId)).toEqual(['A', 'C'])
    expect(after.every((allocation) => allocation.percent === 50)).toBe(true)
  })

  it('refuses to add past the holding limit rather than silently dropping a pick', () => {
    const ids = Array.from({ length: MAX_HOLDINGS }, (_, index) => `A${index}`)
    const full = draft(...ids)
    const after = toggleAllocation(full, 'ONE-MORE')
    expect(after).toEqual(full)
  })

  it('leaves nothing selected when the last company is dropped', () => {
    expect(toggleAllocation(draft('A'), 'A')).toEqual([])
  })
})

describe('stepAllocation', () => {
  it('moves the holding that was nudged and takes the difference from the others', () => {
    const after = stepAllocation(draft('A', 'B', 'C', 'D'), 'A', 20)
    expect(after[0]).toEqual({ assetId: 'A', percent: 45 })
    expect(allocationTotal(after)).toBe(TOTAL_PCT)
  })

  it('keeps the other holdings in the proportions the player had already chosen', () => {
    const uneven = stepAllocation(stepAllocation(draft('A', 'B', 'C'), 'B', 30), 'A', 5)
    const [, second, third] = uneven
    expect(allocationTotal(uneven)).toBe(TOTAL_PCT)
    expect((second?.percent ?? 0) > (third?.percent ?? 0)).toBe(true)
  })

  it('never lets a holding go below nothing or above everything', () => {
    const floored = stepAllocation(draft('A', 'B'), 'A', -90)
    expect(floored[0]?.percent).toBe(0)
    expect(allocationTotal(floored)).toBe(TOTAL_PCT)

    const capped = stepAllocation(draft('A', 'B'), 'A', 90)
    expect(capped[0]?.percent).toBe(TOTAL_PCT)
    expect(capped[1]?.percent).toBe(0)
  })

  it('gives everything to the only holding there is', () => {
    expect(stepAllocation(draft('A'), 'A', -40)).toEqual([{ assetId: 'A', percent: TOTAL_PCT }])
  })

  it('does nothing for a company the draft does not hold', () => {
    const before = draft('A', 'B')
    expect(stepAllocation(before, 'NOPE', 10)).toEqual(before)
  })

  it('always totals 100 however many times it is nudged', () => {
    let current = draft('A', 'B', 'C', 'D', 'E')
    for (const [assetId, delta] of [
      ['A', 5],
      ['C', -5],
      ['E', 25],
      ['B', -15],
      ['D', 5],
    ] as const) {
      current = stepAllocation(current, assetId, delta)
      expect(allocationTotal(current), `${assetId} ${delta}`).toBe(TOTAL_PCT)
    }
  })
})

describe('isAllocationComplete', () => {
  it('is false with nothing selected, because there is no portfolio to open', () => {
    expect(isAllocationComplete([])).toBe(false)
  })

  it('is true once the selected companies hold all of the money', () => {
    expect(isAllocationComplete(draft('A', 'B', 'C'))).toBe(true)
  })

  it('is false for a draft that does not add up', () => {
    expect(isAllocationComplete([{ assetId: 'A', percent: 90 }])).toBe(false)
  })
})
