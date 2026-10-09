import { DIVIDEND_PERIOD_DAYS, DIVIDEND_TAX_RATE, INDEX_DIVIDEND_YIELD } from './rules'
import { currentPrice } from './selectors'
import type { GameState, Lot } from './state'

/**
 * The index pays a simulated quarterly dividend based on a flat, illustrative annual yield (see
 * `rules.ts` for why this is not a fetched per-day series). Both the player and every NPC receive
 * it on their current share count, and qualified-dividend tax applies to both equally when the
 * tax switch is on, since real investors cannot avoid dividend tax just by reinvesting.
 *
 * The player's dividend is reinvested only if they opted in; every NPC always reinvests, since
 * that discipline is the entire point of a buy-and-hold benchmark.
 */
export function processDividends(state: GameState): GameState {
  if (state.day % DIVIDEND_PERIOD_DAYS !== 0) return state

  const price = currentPrice(state)
  const quarterlyAmount = price * (INDEX_DIVIDEND_YIELD / 4)
  const taxMultiplier = state.settings.tax ? 1 - DIVIDEND_TAX_RATE : 1

  let cash = state.cash
  let shares = state.shares
  let lots = state.lots
  const playerDividend = quarterlyAmount * shares * taxMultiplier
  if (playerDividend > 0) {
    if (state.settings.reinvestDividends) {
      const qty = playerDividend / price
      shares += qty
      const reinvested: Lot = { qty, cost: price, day: state.day }
      lots = [...lots, reinvested]
    } else {
      cash += playerDividend
    }
  }

  const npcs = state.npcs.map((npc) => {
    const dividend = quarterlyAmount * npc.shares * taxMultiplier
    if (dividend <= 0) return npc
    return { ...npc, shares: npc.shares + dividend / price }
  })

  return { ...state, cash, shares, lots, npcs }
}
