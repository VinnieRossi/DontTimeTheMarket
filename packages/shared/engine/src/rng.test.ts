import { describe, expect, it } from 'vitest'
import { nextInt, nextRandom, pickFrom } from './rng'

describe('nextRandom', () => {
  it('returns the same value for the same counter, which is what replay depends on', () => {
    expect(nextRandom(12345)).toEqual(nextRandom(12345))
  })

  it('advances the counter, so the next draw differs from this one', () => {
    const first = nextRandom(1)
    const second = nextRandom(first.state)
    expect(second.state).not.toBe(first.state)
    expect(second.value).not.toBe(first.value)
  })

  it('stays inside [0, 1) across a long walk', () => {
    let state = 99
    for (let draw = 0; draw < 2000; draw++) {
      const next = nextRandom(state)
      expect(next.value).toBeGreaterThanOrEqual(0)
      expect(next.value).toBeLessThan(1)
      state = next.state
    }
  })
})

describe('nextInt', () => {
  it('stays inside [0, max)', () => {
    let state = 7
    for (let draw = 0; draw < 500; draw++) {
      const next = nextInt(state, 10)
      expect(next.value).toBeGreaterThanOrEqual(0)
      expect(next.value).toBeLessThan(10)
      expect(Number.isInteger(next.value)).toBe(true)
      state = next.state
    }
  })

  it('covers the whole range rather than favoring one end', () => {
    const seen = new Set<number>()
    let state = 3
    for (let draw = 0; draw < 500; draw++) {
      const next = nextInt(state, 4)
      seen.add(next.value)
      state = next.state
    }
    expect(seen).toEqual(new Set([0, 1, 2, 3]))
  })
})

describe('pickFrom', () => {
  it('only ever returns a member of the list it was given', () => {
    const items = ['a', 'b', 'c'] as const
    let state = 11
    for (let draw = 0; draw < 200; draw++) {
      const picked = pickFrom(state, items)
      expect(items).toContain(picked.value)
      state = picked.state
    }
  })

  it('is deterministic for a given counter', () => {
    expect(pickFrom(5, ['a', 'b', 'c'])).toEqual(pickFrom(5, ['a', 'b', 'c']))
  })
})
