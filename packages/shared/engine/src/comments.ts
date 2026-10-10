import { nextRandom, pickFrom } from './rng'
import { COMMENT_CHANCE, COMMENT_INTERVAL_DAYS } from './rules'

/**
 * Which situation the player is in, keyed rather than written out, so the words live in
 * `comment-copy.ts` and the engine only decides which pool applies.
 */
export const COMMENT_POOLS = {
  winning: ['winning-1', 'winning-2', 'winning-3', 'winning-4'],
  losing: ['losing-1', 'losing-2', 'losing-3', 'losing-4'],
  overtrading: ['overtrading-1', 'overtrading-2', 'overtrading-3'],
  sittingInCash: ['cash-1', 'cash-2'],
} as const satisfies Record<string, readonly [string, ...string[]]>

export type CommentCategory = keyof typeof COMMENT_POOLS

/**
 * The reading of a run the commentary is chosen from, summarized to the four things any of the
 * lines care about. It arrives as a summary rather than as a run, so one pool of lines covers
 * index runs and portfolio runs without the choosing logic knowing which it is looking at.
 */
export interface CommentarySituation {
  elapsedDays: number
  tradeCount: number
  /** What the player holds, at today's prices. Zero means they are entirely in cash. */
  investedValue: number
  cash: number
  aheadOfBenchmark: boolean
}

export function pickCategory(situation: CommentarySituation): CommentCategory {
  if (situation.tradeCount > situation.elapsedDays / 8 && situation.tradeCount > 6) {
    return 'overtrading'
  }
  if (situation.investedValue < 1 && situation.cash > 0) return 'sittingInCash'
  return situation.aheadOfBenchmark ? 'winning' : 'losing'
}

/** The fields a run has to carry for the commentary to be able to advance it. */
export interface CommentaryHost {
  rngState: number
  lastCommentDay: number
  commentaryKey: string | null
}

/**
 * Possibly selects a new commentary line for this tick, threading the seeded counter through
 * state rather than calling `Math.random()`. Most ticks return the state unchanged by design:
 * the line should not change every single day.
 */
export function maybeUpdateCommentary<T extends CommentaryHost>(
  state: T,
  situation: CommentarySituation
): T {
  if (situation.elapsedDays - state.lastCommentDay < COMMENT_INTERVAL_DAYS) return state

  const roll = nextRandom(state.rngState)
  if (roll.value > COMMENT_CHANCE) return { ...state, rngState: roll.state }

  const picked = pickFrom(roll.state, COMMENT_POOLS[pickCategory(situation)])
  return {
    ...state,
    rngState: picked.state,
    lastCommentDay: situation.elapsedDays,
    commentaryKey: picked.value,
  }
}
