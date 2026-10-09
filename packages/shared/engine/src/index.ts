export type {
  ChartData,
  ChartPoint,
  ChartSeries,
  ChartSeriesRole,
  ChartTradeMarker,
} from './chart-series'
export { buildChartData } from './chart-series'
export { COMMENT_COPY, commentaryText } from './comment-copy'
export type { CommentCategory } from './comments'
export { COMMENT_POOLS, maybeUpdateCommentary, pickCategory } from './comments'
export type { IndicatorChip, IndicatorToggles } from './indicators'
export {
  COMPLEXITY_LABELS,
  complexityLabel,
  DEFAULT_INDICATORS,
  indicatorChips,
} from './indicators'
export type { MacroSeries, NasdaqSeries } from './market-data'
export { closeAt, MAX_START_DAY, MIN_START_DAY, macro, nasdaq, SERIES_LENGTH } from './market-data'
export { macdFromMomentum, rsiFromMomentum } from './momentum'
export { BOGLE_NPC_ID } from './npc'
export { executeBuy, executeSell } from './orders'
export type { RunLength, Speed } from './rules'
export {
  CHART_WINDOW_DAYS,
  FEE_BPS,
  MIN_SCORING_DAYS,
  RUN_LENGTH_DAYS,
  SPEED_MS,
  SPEEDS,
  STARTING_CASH,
} from './rules'
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
