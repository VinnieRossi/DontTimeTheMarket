import { describe, expect, it } from 'vitest'
import { COMMENT_COPY, commentaryText } from './comment-copy'
import { COMMENT_POOLS, maybeUpdateCommentary, pickCategory } from './comments'
import { COMMENT_INTERVAL_DAYS } from './rules'
import { currentPrice } from './selectors'
import type { GameState } from './state'
import { freshRun, tickTimes } from './test-support'

/** A run far enough along that a commentary slot is open on this tick. */
function slotOpen(state: GameState): GameState {
  return { ...state, day: state.startDay + COMMENT_INTERVAL_DAYS, lastCommentDay: 0 }
}

describe('pickCategory', () => {
  it('calls out a player who trades constantly', () => {
    const state = slotOpen(freshRun(2))
    expect(pickCategory({ ...state, tradeCount: 50 })).toBe('overtrading')
  })

  it('calls out a player holding nothing but cash', () => {
    const state = slotOpen(freshRun(2))
    expect(pickCategory({ ...state, shares: 0, cash: 10_000 })).toBe('sittingInCash')
  })

  it('reads the gap against the benchmark when the player is actually invested', () => {
    const state = slotOpen(freshRun(2))
    const price = currentPrice(state)
    const winning: GameState = { ...state, cash: 0, shares: 100_000 / price }
    const losing: GameState = { ...state, cash: 0, shares: 1 / price }
    expect(pickCategory(winning)).toBe('winning')
    expect(pickCategory(losing)).toBe('losing')
  })
})

describe('maybeUpdateCommentary', () => {
  it('says nothing again until the interval has passed', () => {
    const state = tickTimes(freshRun(2), 3)
    const quiet: GameState = { ...state, lastCommentDay: 2 }
    expect(maybeUpdateCommentary(quiet)).toBe(quiet)
  })

  it('advances the counter even on a tick it stays quiet, so the sequence is one stream', () => {
    const state = slotOpen(freshRun(2))
    let silentRolls = 0
    let withCounter = state
    for (let attempt = 0; attempt < 40; attempt++) {
      const after = maybeUpdateCommentary(withCounter)
      expect(after.rngState).not.toBe(withCounter.rngState)
      if (after.commentaryKey === null) silentRolls += 1
      withCounter = slotOpen({ ...after, commentaryKey: null, rngState: after.rngState })
    }
    expect(silentRolls).toBeGreaterThan(0)
  })

  it('eventually picks a line, and only ever one the copy table can render', () => {
    let state = slotOpen(freshRun(2))
    for (let attempt = 0; attempt < 40 && state.commentaryKey === null; attempt++) {
      state = slotOpen(maybeUpdateCommentary(state))
    }
    expect(state.commentaryKey).not.toBeNull()
    expect(commentaryText(state.commentaryKey)).not.toBe('')
  })

  it('is deterministic for a given counter', () => {
    const state = slotOpen(freshRun(2))
    expect(maybeUpdateCommentary(state)).toEqual(maybeUpdateCommentary(state))
  })
})

describe('the copy table', () => {
  it('has a line for every key the engine can pick', () => {
    for (const pool of Object.values(COMMENT_POOLS)) {
      for (const key of pool) {
        expect(COMMENT_COPY[key], key).toMatch(/\S/)
      }
    }
  })

  it('renders nothing for no key and nothing for a key it does not know', () => {
    expect(commentaryText(null)).toBe('')
    expect(commentaryText('not-a-key')).toBe('')
  })
})
