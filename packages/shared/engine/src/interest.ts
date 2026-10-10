import { macro, macroAt } from './market-data'
import { IDLE_CASH_FALLBACK_APY } from './rules'
import type { RealismSettings } from './settings'

/**
 * Idle cash earns the contemporaneous 3-month T-bill rate (FRED series DTB3) for the simulated
 * day, baked alongside the price data, falling back to a flat annualized rate on the rare day
 * that series has no value. This makes sitting in cash a real, historically grounded choice
 * rather than a free option.
 *
 * It is written against the three fields it actually needs rather than against one kind of run,
 * because cash earns the same rate whether the run holds the index or a basket of companies.
 */
export function processInterest<T extends { cash: number; day: number; settings: RealismSettings }>(
  state: T
): T {
  if (!state.settings.interest || state.cash <= 0) return state
  const percent = macroAt(macro.dtb3, state.day)
  const annualRate = percent !== undefined && percent >= 0 ? percent / 100 : IDLE_CASH_FALLBACK_APY
  return { ...state, cash: state.cash * (1 + annualRate / 365) }
}
