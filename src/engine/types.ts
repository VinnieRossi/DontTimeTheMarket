export type RunLength = "short" | "standard" | "long";

export const RUN_LENGTH_DAYS: Record<RunLength, number> = {
  short: 252,
  standard: 756,
  long: 2520,
};

export const STARTING_CASH = 10_000;
export const LONG_TERM_DAYS = 252;
export const TAX_SHORT_RATE = 0.24;
export const TAX_LONG_RATE = 0.15;
export const DIVIDEND_TAX_RATE = 0.15;
export const FEE_BPS = 3;
export const MIN_SCORING_DAYS = 42;
/** Flat fallback annualized rate for idle cash interest when the baked
 * 3-month T-bill series has no value for a given day (should not happen
 * with the current baked range, but keeps the engine total). */
export const IDLE_CASH_FALLBACK_APY = 0.02;
/** Illustrative annualized dividend yield for the index. FRED has no
 * free, no-key, per-day dividend-yield series for the Nasdaq Composite,
 * so this is a flat, disclosed approximation rather than fetched data. */
export const INDEX_DIVIDEND_YIELD = 0.018;
export const DIVIDEND_PERIOD_DAYS = 63;

export type Speed = "paused" | "1x" | "4x" | "16x";

export const SPEED_MS: Record<Speed, number> = {
  paused: 0,
  "1x": 550,
  "4x": 160,
  "16x": 45,
};

export interface RealismSettings {
  fees: boolean;
  tax: boolean;
  interest: boolean;
  reinvestDividends: boolean;
}

export const DEFAULT_SETTINGS: RealismSettings = {
  fees: true,
  tax: true,
  interest: true,
  reinvestDividends: false,
};

export interface Lot {
  qty: number;
  cost: number;
  /** Absolute index into the baked series at which this lot was bought. */
  day: number;
}

export type OrderType = "market" | "limit" | "stop" | "takeProfit";
export type OrderSide = "buy" | "sell";

export interface PendingOrder {
  id: number;
  side: OrderSide;
  orderType: OrderType;
  /** For buy orders: how much cash to spend. */
  amountUsd?: number;
  /** For sell orders: how many shares to sell. */
  qty?: number;
  /** For limit/stop/takeProfit orders: the trigger price. */
  targetPrice?: number;
}

export interface TradeLogEntry {
  /** Elapsed trading days since the run started (0-based). */
  day: number;
  price: number;
  side: OrderSide;
}

/**
 * A benchmark NPC the player is compared against. The engine treats every
 * NPC generically (a starting allocation that is bought once and held),
 * so a second NPC can be added later without engine changes - only a new
 * entry in the initial NPC list.
 */
export interface NpcState {
  id: string;
  name: string;
  /** Cash is always 0 for a buy-and-hold NPC after its initial buy, but
   * kept explicit rather than assumed so the model stays generic. */
  cash: number;
  shares: number;
}

export interface IndicatorToggles {
  sma: boolean;
  volume: boolean;
  rsi: boolean;
  macd: boolean;
  bb: boolean;
  atr: boolean;
  vix: boolean;
  yieldCurve: boolean;
  cpi: boolean;
  unemployment: boolean;
  fedFunds: boolean;
  m2: boolean;
}

export const DEFAULT_INDICATORS: IndicatorToggles = {
  sma: false,
  volume: false,
  rsi: false,
  macd: false,
  bb: false,
  atr: false,
  vix: false,
  yieldCurve: false,
  cpi: false,
  unemployment: false,
  fedFunds: false,
  m2: false,
};

export interface MomentumState {
  avgGain: number;
  avgLoss: number;
  ema12: number | null;
  ema26: number | null;
  signalEma: number | null;
}

export interface ValueHistoryEntry {
  /** Absolute index into the baked series. */
  day: number;
  playerValue: number;
  npcValues: Record<string, number>;
}

export type GamePhase = "running" | "ended";

export interface GameState {
  phase: GamePhase;
  seed: number;
  /** mulberry32 PRNG counter; advances deterministically as part of the
   * state transition whenever a random draw (start day, a commentary
   * line) is needed. Never read from Math.random() or Date.now(). */
  rngState: number;
  runLength: RunLength;
  horizonDays: number;
  startDay: number;
  day: number;
  cash: number;
  shares: number;
  lots: Lot[];
  pending: PendingOrder[];
  nextOrderId: number;
  npcs: NpcState[];
  settings: RealismSettings;
  indicators: IndicatorToggles;
  momentum: MomentumState;
  tradeLog: TradeLogEntry[];
  valueHistory: ValueHistoryEntry[];
  tradeCount: number;
  taxPaid: number;
  feesPaid: number;
  peakValue: number;
  maxDrawdownPct: number;
  lastCommentDay: number;
  commentaryKey: string | null;
  speed: Speed;
}

export type Action =
  | { type: "START_RUN"; seed: number; runLength: RunLength }
  | { type: "TICK" }
  | { type: "SET_SPEED"; speed: Speed }
  | { type: "PLACE_ORDER"; order: Omit<PendingOrder, "id"> }
  | { type: "CANCEL_ORDER"; id: number }
  | { type: "SET_SETTING"; key: keyof RealismSettings; value: boolean }
  | { type: "SET_INDICATOR"; key: keyof IndicatorToggles; value: boolean }
  | { type: "CASH_OUT" }
  | { type: "CONTINUE" };
