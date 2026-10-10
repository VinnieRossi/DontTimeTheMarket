import type { IndicatorToggles } from './indicators'
import type { RunLength, Speed } from './rules'
import type { RealismSettings } from './settings'

export interface Lot {
  qty: number
  cost: number
  /** Absolute index into the baked series at which this lot was bought. */
  day: number
}

export type OrderType = 'market' | 'limit' | 'stop' | 'takeProfit'
export type OrderSide = 'buy' | 'sell'

export interface PendingOrder {
  id: number
  side: OrderSide
  orderType: OrderType
  /** For buy orders: how much cash to spend. */
  amountUsd?: number
  /** For sell orders: how many shares to sell. */
  qty?: number
  /** For limit, stop, and take-profit orders: the trigger price. */
  targetPrice?: number
  /**
   * Which company the order is for, in a portfolio run. An index run holds one position and
   * leaves this unset; a portfolio order without it has nothing to fill against and is dropped.
   */
  assetId?: string
}

export interface TradeLogEntry {
  /** Elapsed trading days since the run started, zero based. */
  day: number
  price: number
  side: OrderSide
  /** Which company was traded, in a portfolio run. */
  assetId?: string
}

/**
 * A benchmark NPC the player is compared against. The engine treats every NPC generically (a
 * starting allocation that is bought once and held), so a second NPC can be added later without
 * engine changes, only a new entry in the initial NPC list.
 */
export interface NpcState {
  id: string
  name: string
  /**
   * Cash is always 0 for a buy-and-hold NPC after its initial buy, but kept explicit rather than
   * assumed so the model stays generic.
   */
  cash: number
  shares: number
}

export interface MomentumState {
  avgGain: number
  avgLoss: number
  ema12: number | null
  ema26: number | null
  signalEma: number | null
}

export interface ValueHistoryEntry {
  /** Absolute index into the baked series. */
  day: number
  playerValue: number
  npcValues: Record<string, number>
}

export type GamePhase = 'running' | 'ended'

export interface GameState {
  /** Which kind of run this is, so one `step` can take either without inspecting its shape. */
  mode: 'index'
  phase: GamePhase
  seed: number
  /**
   * mulberry32 counter. It advances deterministically as part of the state transition whenever a
   * random draw (the start day, a commentary line) is needed, so nothing in the engine reads
   * `Math.random()` or the clock.
   */
  rngState: number
  runLength: RunLength
  horizonDays: number
  startDay: number
  day: number
  cash: number
  shares: number
  lots: Lot[]
  pending: PendingOrder[]
  nextOrderId: number
  npcs: NpcState[]
  settings: RealismSettings
  indicators: IndicatorToggles
  momentum: MomentumState
  tradeLog: TradeLogEntry[]
  valueHistory: ValueHistoryEntry[]
  tradeCount: number
  taxPaid: number
  feesPaid: number
  peakValue: number
  maxDrawdownPct: number
  lastCommentDay: number
  commentaryKey: string | null
  speed: Speed
}

export type Action =
  | { type: 'START_RUN'; seed: number; runLength: RunLength }
  | { type: 'TICK' }
  | { type: 'SET_SPEED'; speed: Speed }
  | { type: 'PLACE_ORDER'; order: Omit<PendingOrder, 'id'> }
  | { type: 'CANCEL_ORDER'; id: number }
  | { type: 'SET_SETTING'; key: keyof RealismSettings; value: boolean }
  | { type: 'SET_INDICATOR'; key: keyof IndicatorToggles; value: boolean }
  | { type: 'CASH_OUT' }
  | { type: 'CONTINUE' }
  | { type: 'REBALANCE' }
