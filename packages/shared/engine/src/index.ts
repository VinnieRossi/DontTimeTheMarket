export {
  allocationTotal,
  isAllocationComplete,
  splitEvenly,
  stepAllocation,
  TOTAL_PCT,
  toggleAllocation,
} from './allocations'
export type {
  ChartData,
  ChartPoint,
  ChartSeries,
  ChartSeriesRole,
  ChartTradeMarker,
} from './chart-series'
export { buildChartData } from './chart-series'
export { COMMENT_COPY, commentaryText } from './comment-copy'
export type { CommentarySituation, CommentCategory } from './comments'
export { COMMENT_POOLS, maybeUpdateCommentary, pickCategory } from './comments'
export { analystNote } from './disguise-copy'
export type { IndicatorChip, IndicatorHost, IndicatorToggles } from './indicators'
export {
  COMPLEXITY_LABELS,
  complexityLabel,
  DEFAULT_INDICATORS,
  indexIndicatorChips,
  indicatorChips,
} from './indicators'
export type { MacroSeries, NasdaqSeries } from './market-data'
export {
  closeAt,
  MAX_START_DAY,
  MIN_START_DAY,
  macro,
  macroAt,
  maybeCloseAt,
  nasdaq,
  SERIES_LENGTH,
} from './market-data'
export { advanceMomentum, macdFromMomentum, rsiFromMomentum } from './momentum'
export { BOGLE_NPC_ID, BOGLE_NPC_NAME } from './npc'
export { buyAmountForPercent, executeBuy, executeSell, sellQtyForPercent } from './orders'
export {
  buildPortfolioChartData,
  holdingSparkline,
  portfolioIndicatorChips,
  valueAccessor,
} from './portfolio-chart'
export {
  buyAmountForPercent as portfolioBuyAmountForPercent,
  sellQtyForPercent as portfolioSellQtyForPercent,
} from './portfolio-orders'
/*
 * The portfolio reads keep a prefix where an index run has a read of the same name. The two are
 * not interchangeable (one takes a `GameState`, the other a `PortfolioRunState`), so naming them
 * apart is what stops a call site from reaching for the wrong one and finding out at runtime.
 */
export {
  assetIn,
  cagr as portfolioCagr,
  canCashOut as portfolioCanCashOut,
  edgeBpsVs as portfolioEdgeBpsVs,
  elapsedDays as portfolioElapsedDays,
  elapsedYears as portfolioElapsedYears,
  hasRoomToContinue as portfolioHasRoomToContinue,
  holdingIn,
  holdingValue,
  investedValue,
  isLongTermLot as portfolioIsLongTermLot,
  maybePriceAt,
  npcValue as portfolioNpcValue,
  portfolioValue,
  priceOf,
  recordedValueAt,
  runningGapPctVs as portfolioRunningGapPctVs,
  totalReturnPct as portfolioTotalReturnPct,
  weightPctOf,
} from './portfolio-selectors'
export type {
  Allocation,
  AssetSeries,
  BasketNpcState,
  CapTier,
  DisguisedCompany,
  FundamentalTrends,
  Holding,
  PortfolioRunState,
  RosterCompany,
  StockRoster,
  UniverseAsset,
} from './portfolio-state'
export type { RunLength, Speed } from './rules'
export {
  ALLOCATION_STEP_PCT,
  CHART_WINDOW_DAYS,
  FEE_BPS,
  MAX_HOLDINGS,
  MIN_SCORING_DAYS,
  REBALANCE_DRIFT_PCT,
  RUN_LENGTH_DAYS,
  SPEED_MS,
  SPEEDS,
  STARTING_CASH,
} from './rules'
export type { RunState } from './run-state'
export { isIndexRun, isPortfolioRun } from './run-state'
export {
  cagrOf,
  canCashOutAfter,
  edgeBpsOf,
  elapsedYearsOf,
  hasRoomAfter,
  runningGapPctOf,
  totalReturnPctOf,
} from './scoring'
export {
  cagr,
  canCashOut,
  canContinue,
  currentPrice,
  edgeBpsVs,
  elapsedDays,
  elapsedYears,
  hasRoomToContinue,
  isLongTermLot,
  npcValue,
  playerValue,
  runningGapPctVs,
  totalReturnPct,
} from './selectors'
export type { RealismSettings } from './settings'
export { DEFAULT_SETTINGS } from './settings'
export type {
  Action,
  GamePhase,
  GameState,
  Lot,
  MomentumState,
  NpcState,
  OrderSide,
  OrderType,
  PendingOrder,
  TradeLogEntry,
  ValueHistoryEntry,
} from './state'
export { startRun, step } from './step'
export type { PriceAt } from './technicals'
