import { describe, expect, it } from 'vitest'
import { COMMENT_COPY, commentaryText } from './comment-copy'
import {
  COMMENT_POOLS,
  type CommentaryHost,
  type CommentarySituation,
  maybeUpdateCommentary,
  pickCategory,
} from './comments'
import { COMMENT_INTERVAL_DAYS } from './rules'

/** A plainly invested, plainly winning run, which each test below varies one field of. */
const INVESTED: CommentarySituation = {
  elapsedDays: COMMENT_INTERVAL_DAYS,
  tradeCount: 0,
  investedValue: 10_000,
  cash: 0,
  aheadOfBenchmark: true,
}

function host(rngState: number): CommentaryHost {
  return { rngState, lastCommentDay: 0, commentaryKey: null }
}

describe('pickCategory', () => {
  it('calls out a player who trades constantly', () => {
    expect(pickCategory({ ...INVESTED, tradeCount: 50 })).toBe('overtrading')
  })

  it('calls out a player holding nothing but cash', () => {
    expect(pickCategory({ ...INVESTED, investedValue: 0, cash: 10_000 })).toBe('sittingInCash')
  })

  it('reads the gap against the benchmark when the player is actually invested', () => {
    expect(pickCategory(INVESTED)).toBe('winning')
    expect(pickCategory({ ...INVESTED, aheadOfBenchmark: false })).toBe('losing')
  })
})

describe('maybeUpdateCommentary', () => {
  it('says nothing again until the interval has passed', () => {
    const quiet = { ...host(7), lastCommentDay: 2 }
    const soon = { ...INVESTED, elapsedDays: 3 }
    expect(maybeUpdateCommentary(quiet, soon)).toBe(quiet)
  })

  it('advances the counter even on a tick it stays quiet, so the sequence is one stream', () => {
    let state = host(11)
    let silentRolls = 0
    for (let attempt = 0; attempt < 40; attempt++) {
      const after = maybeUpdateCommentary(state, INVESTED)
      expect(after.rngState).not.toBe(state.rngState)
      if (after.commentaryKey === null) silentRolls += 1
      state = { ...after, lastCommentDay: 0, commentaryKey: null }
    }
    expect(silentRolls).toBeGreaterThan(0)
  })

  it('eventually picks a line, and only ever one the copy table can render', () => {
    let state = host(11)
    for (let attempt = 0; attempt < 40 && state.commentaryKey === null; attempt++) {
      state = { ...maybeUpdateCommentary(state, INVESTED), lastCommentDay: 0 }
    }
    expect(state.commentaryKey).not.toBeNull()
    expect(commentaryText(state.commentaryKey)).not.toBe('')
  })

  it('is deterministic for a given counter', () => {
    const state = host(11)
    expect(maybeUpdateCommentary(state, INVESTED)).toEqual(maybeUpdateCommentary(state, INVESTED))
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
