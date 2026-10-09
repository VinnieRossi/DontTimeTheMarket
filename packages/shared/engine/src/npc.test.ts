import { describe, expect, it } from 'vitest'
import { closeAt, MIN_START_DAY } from './market-data'
import { BOGLE_NPC_ID, createInitialNpcs } from './npc'
import { STARTING_CASH } from './rules'

describe('createInitialNpcs', () => {
  it('puts the benchmark fully into the index on day one, holding no cash', () => {
    const [bogle, ...rest] = createInitialNpcs(MIN_START_DAY)
    expect(rest).toHaveLength(0)
    expect(bogle?.id).toBe(BOGLE_NPC_ID)
    expect(bogle?.cash).toBe(0)
    expect(bogle?.shares).toBeCloseTo(STARTING_CASH / closeAt(MIN_START_DAY), 10)
  })

  it('refuses a start day the baked series does not cover', () => {
    expect(() => createInitialNpcs(-5)).toThrow(/No price data/)
  })
})
