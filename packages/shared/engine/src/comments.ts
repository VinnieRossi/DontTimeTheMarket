import { BOGLE_NPC_ID } from './npc'
import { nextRandom, pickFrom } from './rng'
import { COMMENT_CHANCE, COMMENT_INTERVAL_DAYS } from './rules'
import { currentPrice, edgeBpsVs, elapsedDays } from './selectors'
import type { GameState } from './state'

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

export function pickCategory(state: GameState): CommentCategory {
  const invested = state.shares * currentPrice(state)
  if (state.tradeCount > elapsedDays(state) / 8 && state.tradeCount > 6) return 'overtrading'
  if (invested < 1 && state.cash > 0) return 'sittingInCash'
  return edgeBpsVs(state, BOGLE_NPC_ID) >= 0 ? 'winning' : 'losing'
}

/**
 * Possibly selects a new commentary line for this tick, threading the seeded counter through
 * state rather than calling `Math.random()`. Most ticks return the state unchanged by design:
 * the line should not change every single day.
 */
export function maybeUpdateCommentary(state: GameState): GameState {
  if (elapsedDays(state) - state.lastCommentDay < COMMENT_INTERVAL_DAYS) return state

  const roll = nextRandom(state.rngState)
  if (roll.value > COMMENT_CHANCE) return { ...state, rngState: roll.state }

  const picked = pickFrom(roll.state, COMMENT_POOLS[pickCategory(state)])
  return {
    ...state,
    rngState: picked.state,
    lastCommentDay: elapsedDays(state),
    commentaryKey: picked.value,
  }
}
