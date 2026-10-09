import { BOGLE_NPC_ID } from "./npc";
import { nextRandom, nextInt } from "./rng";
import { edgeBpsVs, elapsedDays, currentPrice } from "./selectors";
import type { GameState } from "./types";

/**
 * Commentary lines, keyed rather than stored as literal text in state, so
 * the UI owns the actual copy and the engine only needs to decide which
 * situation applies. Keeping the words out of engine state also keeps a
 * replayed action log comparing cleanly: two replays of the same seed
 * produce the same key sequence even if the UI's copy for a key changes
 * later.
 */
export const COMMENT_POOLS = {
  winning: [
    "winning-1",
    "winning-2",
    "winning-3",
    "winning-4",
  ],
  losing: ["losing-1", "losing-2", "losing-3", "losing-4"],
  overtrading: ["overtrading-1", "overtrading-2", "overtrading-3"],
  sittingInCash: ["cash-1", "cash-2"],
} as const;

export type CommentCategory = keyof typeof COMMENT_POOLS;

function pickCategory(state: GameState): CommentCategory {
  const invested = state.shares * currentPrice(state);
  if (state.tradeCount > elapsedDays(state) / 8 && state.tradeCount > 6) {
    return "overtrading";
  }
  if (invested < 1 && state.cash > 0) {
    return "sittingInCash";
  }
  return edgeBpsVs(state, BOGLE_NPC_ID) >= 0 ? "winning" : "losing";
}

/** Possibly selects a new commentary line for this tick, threading the
 * seeded RNG through state rather than calling Math.random(). Returns
 * the state unchanged (same commentaryKey) most ticks, by design - the
 * line should not change every single day. */
export function maybeUpdateCommentary(state: GameState): GameState {
  if (elapsedDays(state) - state.lastCommentDay < 12) return state;

  const roll = nextRandom(state.rngState);
  if (roll.value > 0.35) {
    return { ...state, rngState: roll.state };
  }

  const category = pickCategory(state);
  const pool = COMMENT_POOLS[category];
  const picked = nextInt(roll.state, pool.length);

  return {
    ...state,
    rngState: picked.state,
    lastCommentDay: elapsedDays(state),
    commentaryKey: pool[picked.value]!,
  };
}
