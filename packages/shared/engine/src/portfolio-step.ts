import { assertNever } from '@dttm/utils'
import { maybeUpdateCommentary } from './comments'
import { externalNpcValue } from './external-npcs'
import { processInterest } from './interest'
import { SERIES_LENGTH } from './market-data'
import { advanceMomentum } from './momentum'
import { BOGLE_NPC_ID } from './npc'
import { processDividends } from './portfolio-dividends'
import { planRebalance, processPendingOrders } from './portfolio-orders'
import {
  canCashOut,
  edgeBpsVs,
  elapsedDays,
  hasRoomToContinue,
  investedValue,
  npcValue,
  portfolioValue,
} from './portfolio-selectors'
import type { PortfolioRunState } from './portfolio-state'
import { RUN_LENGTH_DAYS } from './rules'
import type { Action, ValueHistoryEntry } from './state'
import { advanceDrawdown } from './trade-math'

/**
 * One simulated trading day of a portfolio run. The order of the steps is the order of the day,
 * and it is the same order an index day runs in: orders fill at today's prices first, then the
 * day's income lands, then the indicators advance, and only then is the day's value recorded.
 *
 * Nothing in here reads the clock, the environment, or `Math.random()`. Every price it needs is in
 * the universe the run carries and every random draw advances a counter carried in the state, so
 * the same seed and the same actions always produce the same run.
 */
function npcValues(state: PortfolioRunState): Record<string, number> {
  const values: Record<string, number> = {}
  for (const npc of state.npcs) {
    values[npc.id] = npcValue(state, npc.id)
  }
  for (const npc of state.externalNpcs) {
    values[npc.id] = externalNpcValue(npc, state.day)
  }
  return values
}

function tick(state: PortfolioRunState): PortfolioRunState {
  if (state.phase === 'ended') return state
  if (state.day + 1 >= SERIES_LENGTH) return { ...state, phase: 'ended' }

  const previousValue = state.valueHistory[state.valueHistory.length - 1]?.playerValue ?? 0

  let next: PortfolioRunState = { ...state, day: state.day + 1 }
  next = processPendingOrders(next)
  next = processDividends(next)
  next = processInterest(next)

  const value = portfolioValue(next)
  const entry: ValueHistoryEntry = { day: next.day, playerValue: value, npcValues: npcValues(next) }

  next = {
    ...next,
    // A portfolio run has no single market price, so what the smoothed indicators read is the
    // portfolio's own value. It is the line that is actually on the screen, which is the one a
    // player would be reading an RSI off in any case.
    momentum: advanceMomentum(next.momentum, value, previousValue),
    ...advanceDrawdown(next, value),
    valueHistory: [...next.valueHistory, entry],
  }

  next = maybeUpdateCommentary(next, {
    elapsedDays: elapsedDays(next),
    tradeCount: next.tradeCount,
    investedValue: investedValue(next),
    cash: next.cash,
    aheadOfBenchmark: edgeBpsVs(next, BOGLE_NPC_ID) >= 0,
  })

  if (elapsedDays(next) >= next.horizonDays) return { ...next, phase: 'ended' }
  return next
}

function continueRun(state: PortfolioRunState): PortfolioRunState {
  if (state.phase !== 'ended') return state
  if (edgeBpsVs(state, BOGLE_NPC_ID) < 0 || !hasRoomToContinue(state)) return state
  return {
    ...state,
    phase: 'running',
    horizonDays: state.horizonDays + RUN_LENGTH_DAYS[state.runLength],
  }
}

/** Advances a portfolio run by one action. Pure, like its index-run counterpart. */
export function stepPortfolio(state: PortfolioRunState, action: Action): PortfolioRunState {
  switch (action.type) {
    case 'START_RUN':
      // Opening a run is not a transition inside one. An index run is opened by `startRun` and a
      // portfolio run by `startPortfolioRun`, which is the only function that reads the roster.
      return state
    case 'TICK':
      return tick(state)
    case 'SET_SPEED':
      return { ...state, speed: action.speed }
    case 'PLACE_ORDER':
      if (action.order.assetId === undefined) return state
      return {
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pending: [...state.pending, { ...action.order, id: state.nextOrderId }],
      }
    case 'CANCEL_ORDER':
      return { ...state, pending: state.pending.filter((order) => order.id !== action.id) }
    case 'REBALANCE':
      return state.phase === 'running' ? planRebalance(state) : state
    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }
    case 'SET_INDICATOR':
      return { ...state, indicators: { ...state.indicators, [action.key]: action.value } }
    case 'CASH_OUT':
      return canCashOut(state) ? { ...state, phase: 'ended' } : state
    case 'CONTINUE':
      return continueRun(state)
    default:
      return assertNever(action, 'action')
  }
}
