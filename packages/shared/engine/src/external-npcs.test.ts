import { describe, expect, it } from 'vitest'
import {
  createInitialExternalNpcs,
  externalCloseAt,
  externalNpcValue,
  payExternalNpcDividends,
} from './external-npcs'
import { MIN_START_DAY } from './market-data'
import { STARTING_CASH } from './rules'

describe('createInitialExternalNpcs', () => {
  it('starts with none of the external NPCs for a run drawn before any of their histories', () => {
    expect(createInitialExternalNpcs(MIN_START_DAY)).toHaveLength(0)
  })

  it('starts with all three external NPCs for a run drawn after the last of their histories opens', () => {
    const npcs = createInitialExternalNpcs(8000)
    expect(npcs.map((npc) => npc.id).sort()).toEqual(['berkshire', 'nasdaq100', 'sp500'])
  })

  it('starts with only the S&P 500 and Berkshire NPCs for a run drawn before the Nasdaq-100 one existed', () => {
    const npcs = createInitialExternalNpcs(6500)
    expect(npcs.map((npc) => npc.id).sort()).toEqual(['berkshire', 'sp500'])
  })

  it('puts the whole starting stake into the series on day one, holding no cash', () => {
    const [npc] = createInitialExternalNpcs(8000)
    expect(npc?.cash).toBe(0)
    const price = externalCloseAt(npc?.seriesId ?? 'sp500', 8000)
    expect(npc?.shares).toBeCloseTo(STARTING_CASH / (price ?? 1), 8)
  })
})

describe('externalNpcValue', () => {
  it('values an NPC as cash plus shares at the series price on that day', () => {
    const [npc] = createInitialExternalNpcs(8000)
    if (npc === undefined) throw new Error('expected an NPC')
    const price = externalCloseAt(npc.seriesId, 8010)
    expect(externalNpcValue(npc, 8010)).toBeCloseTo(npc.cash + npc.shares * (price ?? 0), 8)
  })
})

describe('payExternalNpcDividends', () => {
  it('returns the input unchanged when no series paid a dividend that day', () => {
    const npcs = createInitialExternalNpcs(8000)
    const result = payExternalNpcDividends(npcs, 8001, 1)
    expect(result).toBe(npcs)
  })

  it('reinvests a real per-share dividend into more shares, compounding over several payments', () => {
    const npcs = createInitialExternalNpcs(8000)
    const sp500 = npcs.find((npc) => npc.id === 'sp500')
    if (sp500 === undefined) throw new Error('expected the S&P 500 NPC')

    // SPY pays quarterly; scanning forward from day 8000 finds the next day with a real payout.
    let day = 8000
    let afterFirst = npcs
    for (; day < 8300; day += 1) {
      const paid = payExternalNpcDividends(afterFirst, day, 1)
      if (paid !== afterFirst) {
        afterFirst = paid
        break
      }
    }
    const firstSp500 = afterFirst.find((npc) => npc.id === 'sp500')
    expect(firstSp500?.shares).toBeGreaterThan(sp500.shares)

    let afterSecond = afterFirst
    day += 1
    for (; day < 8600; day += 1) {
      const paid = payExternalNpcDividends(afterSecond, day, 1)
      if (paid !== afterSecond) {
        afterSecond = paid
        break
      }
    }
    const secondSp500 = afterSecond.find((npc) => npc.id === 'sp500')
    expect(secondSp500?.shares).toBeGreaterThan(firstSp500?.shares ?? 0)
  })

  it('withholds dividend tax when the tax multiplier is below one', () => {
    const npcs = createInitialExternalNpcs(8000)
    let day = 8000
    let taxed: ReturnType<typeof payExternalNpcDividends> | undefined
    let untaxed: ReturnType<typeof payExternalNpcDividends> | undefined
    for (; day < 8300; day += 1) {
      const result = payExternalNpcDividends(npcs, day, 0.85)
      if (result !== npcs) {
        taxed = result
        untaxed = payExternalNpcDividends(npcs, day, 1)
        break
      }
    }
    const taxedShares = taxed?.find((npc) => npc.id === 'sp500')?.shares
    const untaxedShares = untaxed?.find((npc) => npc.id === 'sp500')?.shares
    expect(taxedShares).toBeLessThan(untaxedShares ?? 0)
  })
})
