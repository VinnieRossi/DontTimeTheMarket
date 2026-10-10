import type { PortfolioRunState } from './portfolio-state'
import type { GameState } from './state'

/**
 * A run, of either kind. The two shapes are discriminated by `mode`, which is what lets one
 * `step` take either one and lets a screen ask which it is holding without inspecting fields.
 *
 * They are two shapes rather than one because an index run holds a single position in a series
 * that exists whether or not the player owns any of it, while a portfolio run holds several
 * positions and carries its own universe. Flattening them into one shape would mean every index
 * read going through a collection of one and every portfolio read past a market price that does
 * not exist. What they do share is every rule: the fees, the tax, the lot accounting, the interest,
 * the commentary, and the score all live in modules both of them call.
 */
export type RunState = GameState | PortfolioRunState

export function isPortfolioRun(state: RunState): state is PortfolioRunState {
  return state.mode === 'portfolio'
}

export function isIndexRun(state: RunState): state is GameState {
  return state.mode === 'index'
}
