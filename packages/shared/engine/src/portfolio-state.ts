import type { IndicatorToggles } from './indicators'
import type { RunLength, Speed } from './rules'
import type { RealismSettings } from './settings'
import type {
  GamePhase,
  Lot,
  MomentumState,
  PendingOrder,
  TradeLogEntry,
  ValueHistoryEntry,
} from './state'

/** How large a company is, bucketed, because an exact market cap is a giveaway. */
export type CapTier = 'mid' | 'large' | 'mega'

/** Revenue, margin, and leverage as shapes rather than as dollar figures. */
export interface FundamentalTrends {
  years: readonly number[]
  /** Revenue indexed to 100 in the first year shown, so the trend reads without the figure. */
  revenueIndex: readonly number[]
  netMarginPct: readonly number[]
  debtToEquity: readonly number[]
}

/**
 * One company as a run presents it: a generated name and ticker over real, truthful fundamentals.
 *
 * The sector, the industry, the size bucket, the yield, the volatility, and the trends are all
 * real, because judging a company on what it actually does and how it actually trades is the whole
 * exercise. Only the name and the ticker are generated, so brand recognition cannot stand in for
 * that judgment. The real name is carried alongside from the start and shown when the run ends.
 */
export interface DisguisedCompany {
  /** The real ticker. It is the asset's identity for the whole run and is never shown mid-run. */
  id: string
  fakeTicker: string
  fakeName: string
  realName: string
  sector: string
  industry: string
  capTier: CapTier
  dividendYieldPct: number
  volatilityPct: number
  /** Which piece of generic flavor commentary this company drew, keyed like the run commentary. */
  analystNoteKey: string
  fundamentals: FundamentalTrends | null
}

/**
 * A company's real daily history, positioned on the same trading-day grid the index uses, so one
 * day index addresses every series in the simulation.
 */
export interface AssetSeries {
  /** The absolute day index that `close[0]` is the price for. */
  firstDay: number
  close: readonly number[]
  /** Dividend payments as [offset into `close`, amount per share]. */
  dividends: readonly (readonly [number, number])[]
}

export interface UniverseAsset {
  company: DisguisedCompany
  series: AssetSeries
}

export interface Holding {
  assetId: string
  /** The share of the portfolio this holding is meant to be. Targets always total 100. */
  targetPct: number
  shares: number
  lots: readonly Lot[]
}

/**
 * A benchmark that holds a basket. The portfolio equivalent of the single-asset NPC: it buys the
 * same companies at the same percentages on the same first day, reinvests every dividend, and
 * never trades again.
 */
export interface BasketNpcState {
  id: string
  name: string
  cash: number
  /** Share count per company, keyed by the same asset id the player's holdings use. */
  shares: Readonly<Record<string, number>>
}

export interface PortfolioRunState {
  mode: 'portfolio'
  phase: GamePhase
  seed: number
  rngState: number
  runLength: RunLength
  horizonDays: number
  startDay: number
  day: number
  cash: number
  holdings: readonly Holding[]
  pending: readonly PendingOrder[]
  nextOrderId: number
  npcs: readonly BasketNpcState[]
  settings: RealismSettings
  indicators: IndicatorToggles
  momentum: MomentumState
  tradeLog: readonly TradeLogEntry[]
  valueHistory: readonly ValueHistoryEntry[]
  tradeCount: number
  taxPaid: number
  feesPaid: number
  peakValue: number
  maxDrawdownPct: number
  lastCommentDay: number
  commentaryKey: string | null
  speed: Speed
  /**
   * Every company the run can trade, with its prices, carried in the run rather than read from a
   * module.
   *
   * That is what keeps `step` able to advance a portfolio day without importing the baked roster:
   * the roster is read once, when the run opens, and the run carries its own market from then on.
   * The whole universe rides along rather than only the chosen holdings, because buying a company
   * mid-run has to be possible without handing the engine new data in an action.
   */
  universe: readonly UniverseAsset[]
}

/** What the builder hands the opener: which company, and what share of the money. */
export interface Allocation {
  assetId: string
  percent: number
}

/**
 * One company as the baked roster carries it: everything true about it, plus its real history.
 * This is the shape `data/baked/stocks.json` is read as, before a run disguises it.
 */
export interface RosterCompany {
  id: string
  name: string
  sector: string
  industry: string
  /**
   * The size bucket as the baked file carries it, which is a plain string so the committed JSON
   * is assignable to this type with no cast. A run narrows it to `CapTier` when it disguises the
   * roster, which is the one place a bad value could come from the data rather than from code.
   */
  capTier: string
  dividendYieldPct: number
  volatilityPct: number
  close: readonly number[]
  /**
   * Dividend events as flat pairs of [offset into `close`, amount per share]. They are typed as
   * plain number lists rather than as pairs because that is what reading the committed JSON
   * yields; `buildUniverse` turns them into pairs, dropping any entry that is not one.
   */
  dividends: readonly (readonly number[])[]
  fundamentals: FundamentalTrends | null
}

export interface StockRoster {
  /** The absolute day index every company's `close[0]` is the price for. */
  readonly historyStartDay: number
  readonly companies: readonly RosterCompany[]
}
