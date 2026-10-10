import { assertNever } from '@dttm/utils'
import { maybeUpdateCommentary } from './comments'
import { processDividends } from './dividends'
import {
  createInitialExternalNpcs,
  externalNpcValue,
  payExternalNpcDividends,
} from './external-npcs'
import { DEFAULT_INDICATORS } from './indicators'
import { processInterest } from './interest'
import { closeAt, MAX_START_DAY, MIN_START_DAY, SERIES_LENGTH } from './market-data'
import { EMPTY_MOMENTUM, updateMomentum } from './momentum'
import { BOGLE_NPC_ID, createInitialNpcs } from './npc'
import { processPendingOrders } from './orders'
import type { PortfolioRunState } from './portfolio-state'
import { stepPortfolio } from './portfolio-step'
import { nextInt } from './rng'
import {
  DIVIDEND_TAX_RATE,
  MIN_SCORING_DAYS,
  RUN_LENGTH_DAYS,
  type RunLength,
  STARTING_CASH,
} from './rules'
import type { RunState } from './run-state'
import { canContinue, currentPrice, edgeBpsVs, elapsedDays, playerValue } from './selectors'
import { DEFAULT_SETTINGS } from './settings'
import type { Action, GameState } from './state'
import { advanceDrawdown } from './trade-math'

/**
 * The whole simulation is this one pure function. Nothing in here reads the clock, the
 * environment, or `Math.random()`: a tick is a value handed in from outside, and every random
 * draw advances a counter carried in the state. Two runs of the same seed and the same action
 * sequence therefore produce byte-identical states, which is what would let a score be verified
 * by replay rather than trusted.
 *
 * A run is either an index run or a portfolio run. `step` takes either and routes by the run's
 * own `mode`; what the two kinds of day share is every rule about what a trade costs or scores,
 * which lives in modules both of them call rather than being written twice.
 */

/** Opens a fresh index run at a seeded random point in the baked history. */
export function startRun(seed: number, runLength: RunLength): GameState {
  const draw = nextInt(seed, MAX_START_DAY - MIN_START_DAY)
  const startDay = MIN_START_DAY + draw.value
  const externalNpcs = createInitialExternalNpcs(startDay)

  return {
    mode: 'index',
    phase: 'running',
    seed,
    rngState: draw.state,
    runLength,
    horizonDays: RUN_LENGTH_DAYS[runLength],
    startDay,
    day: startDay,
    cash: STARTING_CASH,
    shares: 0,
    lots: [],
    pending: [],
    nextOrderId: 1,
    npcs: createInitialNpcs(startDay),
    externalNpcs,
    settings: DEFAULT_SETTINGS,
    indicators: DEFAULT_INDICATORS,
    momentum: EMPTY_MOMENTUM,
    tradeLog: [],
    valueHistory: [
      {
        day: startDay,
        playerValue: STARTING_CASH,
        npcValues: {
          [BOGLE_NPC_ID]: STARTING_CASH,
          ...Object.fromEntries(
            externalNpcs.map((npc) => [npc.id, externalNpcValue(npc, startDay)])
          ),
        },
      },
    ],
    tradeCount: 0,
    taxPaid: 0,
    feesPaid: 0,
    peakValue: STARTING_CASH,
    maxDrawdownPct: 0,
    lastCommentDay: 0,
    commentaryKey: null,
    speed: '1x',
  }
}

function npcValues(state: GameState): Record<string, number> {
  const price = closeAt(state.day)
  const values: Record<string, number> = {}
  for (const npc of state.npcs) {
    values[npc.id] = npc.cash + npc.shares * price
  }
  for (const npc of state.externalNpcs) {
    values[npc.id] = externalNpcValue(npc, state.day)
  }
  return values
}

/**
 * One simulated trading day. The order of the steps is the order of the day: orders fill at
 * today's price first, then the day's income lands, then the indicators advance, and only then
 * is the day's value recorded.
 */
function tick(state: GameState): GameState {
  if (state.phase === 'ended') return state
  if (state.day + 1 >= SERIES_LENGTH) return { ...state, phase: 'ended' }

  let next: GameState = { ...state, day: state.day + 1 }
  next = processPendingOrders(next)
  next = processDividends(next)
  next = {
    ...next,
    externalNpcs: payExternalNpcDividends(
      next.externalNpcs,
      next.day,
      next.settings.tax ? 1 - DIVIDEND_TAX_RATE : 1
    ),
  }
  next = processInterest(next)
  next = updateMomentum(next)

  const value = playerValue(next)
  next = {
    ...next,
    ...advanceDrawdown(next, value),
    valueHistory: [
      ...next.valueHistory,
      { day: next.day, playerValue: value, npcValues: npcValues(next) },
    ],
  }

  next = maybeUpdateCommentary(next, {
    elapsedDays: elapsedDays(next),
    tradeCount: next.tradeCount,
    investedValue: next.shares * currentPrice(next),
    cash: next.cash,
    aheadOfBenchmark: edgeBpsVs(next, BOGLE_NPC_ID) >= 0,
  })

  if (elapsedDays(next) >= next.horizonDays) return { ...next, phase: 'ended' }
  return next
}

/**
 * Extends a finished run by another full run length. Only offered to a player who is ahead of
 * the benchmark, and only while the baked history has room for the extension.
 */
function continueRun(state: GameState): GameState {
  if (!canContinue(state)) return state
  return {
    ...state,
    phase: 'running',
    horizonDays: state.horizonDays + RUN_LENGTH_DAYS[state.runLength],
  }
}

function stepIndex(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START_RUN':
      return startRun(action.seed, action.runLength)
    case 'TICK':
      return tick(state)
    case 'SET_SPEED':
      return { ...state, speed: action.speed }
    case 'PLACE_ORDER':
      return {
        ...state,
        nextOrderId: state.nextOrderId + 1,
        pending: [...state.pending, { ...action.order, id: state.nextOrderId }],
      }
    case 'CANCEL_ORDER':
      return { ...state, pending: state.pending.filter((order) => order.id !== action.id) }
    case 'REBALANCE':
      // An index run holds one position, so there are no weights to restore between.
      return state
    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }
    case 'SET_INDICATOR':
      return { ...state, indicators: { ...state.indicators, [action.key]: action.value } }
    case 'CASH_OUT':
      if (elapsedDays(state) < MIN_SCORING_DAYS) return state
      return { ...state, phase: 'ended' }
    case 'CONTINUE':
      return continueRun(state)
    default:
      return assertNever(action, 'action')
  }
}

/*
 * Overloaded so a caller that knows which kind of run it holds keeps that knowledge through the
 * call. Without it, every index-mode call site would have to narrow a union back down to the
 * shape it handed in.
 */
export function step(state: GameState, action: Action): GameState
export function step(state: PortfolioRunState, action: Action): PortfolioRunState
export function step(state: RunState, action: Action): RunState
export function step(state: RunState, action: Action): RunState {
  return state.mode === 'portfolio' ? stepPortfolio(state, action) : stepIndex(state, action)
}
