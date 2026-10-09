import {
  BOGLE_NPC_ID,
  buildChartData,
  canCashOut,
  canContinue,
  commentaryText,
  complexityLabel,
  currentPrice,
  edgeBpsVs,
  elapsedDays,
  type GameState,
  hasRoomToContinue,
  type IndicatorToggles,
  indicatorChips,
  MIN_SCORING_DAYS,
  npcValue,
  type PendingOrder,
  playerValue,
  type RealismSettings,
  type RunLength,
  runningGapPctVs,
  SPEEDS,
  type Speed,
  totalReturnPct,
} from '@dttm/engine'
import type {
  ActionView,
  ChartLegendItem,
  ChartMarkerView,
  ChartSeriesView,
  FigureView,
  IndicatorTierView,
  PendingOrderView,
  ReadoutItem,
  SwitchItemView,
} from '@dttm/ui'
import {
  formatBasisPoints,
  formatMoney,
  formatPercent,
  formatShares,
  formatSignedPercent,
} from '@dttm/utils'

/**
 * The mapping from a run to what the screens render. Every figure is formatted here and every
 * state decided here, so the components stay renderable from a story and the engine stays free of
 * copy. Nothing in this file holds a rule: where a decision is the game's rather than the
 * screen's, it asks the engine for it.
 */

export const BENCHMARK_NAME = 'Bogle NPC'

export const RUN_LENGTH_CHOICES: readonly { value: RunLength; label: string }[] = [
  { value: 'short', label: 'Short - 1 year' },
  { value: 'standard', label: 'Standard - 3 years' },
  { value: 'long', label: 'Long - 10 years' },
]

export const SPEED_CHOICES: readonly { value: Speed; label: string }[] = SPEEDS.map((speed) => ({
  value: speed,
  label: speed === 'paused' ? 'Pause' : speed,
}))

/** The readouts, grouped by how far each one sits from the price it is supposed to explain. */
const INDICATOR_TIERS: readonly {
  name: string
  items: readonly { key: keyof IndicatorToggles; label: string }[]
}[] = [
  {
    name: 'Tier 1 - Chart stuff',
    items: [
      { key: 'sma', label: 'Moving averages (20/50)' },
      { key: 'volume', label: 'Volume' },
    ],
  },
  {
    name: 'Tier 2 - Technicals',
    items: [
      { key: 'rsi', label: 'RSI (14)' },
      { key: 'macd', label: 'MACD' },
      { key: 'bb', label: 'Bollinger Bands' },
      { key: 'atr', label: 'ATR (volatility)' },
    ],
  },
  {
    name: 'Tier 3 - Market-wide gauges',
    items: [
      { key: 'vix', label: 'Volatility index' },
      { key: 'yieldCurve', label: 'Yield curve (10y-2y)' },
    ],
  },
  {
    name: 'Tier 4 - Macro overload',
    items: [
      { key: 'cpi', label: 'CPI (inflation)' },
      { key: 'unemployment', label: 'Unemployment rate' },
      { key: 'fedFunds', label: 'Fed funds rate' },
      { key: 'm2', label: 'M2 money supply' },
    ],
  },
]

const REALISM_SWITCHES: readonly { key: keyof RealismSettings; label: string }[] = [
  { key: 'fees', label: 'Trading fees & spread (3 bps)' },
  { key: 'tax', label: 'Capital gains tax' },
  { key: 'interest', label: 'Interest on idle cash' },
  { key: 'reinvestDividends', label: 'Auto-reinvest my dividends' },
]

/**
 * A component reports which switch was flipped by the key it was handed, which arrives as a
 * plain string. These turn it back into the key the engine takes, so nothing has to assert a
 * type the screen could have got wrong.
 */
export function toIndicatorKey(key: string): keyof IndicatorToggles | undefined {
  return INDICATOR_TIERS.flatMap((tier) => tier.items).find((item) => item.key === key)?.key
}

export function toSettingKey(key: string): keyof RealismSettings | undefined {
  return REALISM_SWITCHES.find((item) => item.key === key)?.key
}

export function dayLabel(state: GameState): string {
  return `Day ${elapsedDays(state) + 1} / ${state.horizonDays}`
}

export function chartView(state: GameState): {
  series: readonly ChartSeriesView[]
  markers: readonly ChartMarkerView[]
} {
  return buildChartData(state)
}

export function legendFor(state: GameState): readonly ChartLegendItem[] {
  const items: ChartLegendItem[] = [
    { role: 'price', label: 'Market price' },
    { role: 'player', label: 'Your value' },
    { role: 'benchmark', label: BENCHMARK_NAME },
  ]
  if (state.indicators.sma) {
    items.push({ role: 'sma20', label: 'SMA 20' }, { role: 'sma50', label: 'SMA 50' })
  }
  if (state.indicators.bb) {
    items.push({ role: 'bollingerUpper', label: 'Bollinger Bands' })
  }
  return items
}

export function readoutsFor(state: GameState): readonly ReadoutItem[] {
  return indicatorChips(state)
}

export function playerFigure(state: GameState): FigureView {
  return { label: 'You', value: formatMoney(playerValue(state)) }
}

export function benchmarkFigure(state: GameState): FigureView {
  return { label: BENCHMARK_NAME, value: formatMoney(npcValue(state, BOGLE_NPC_ID)) }
}

export function tilesFor(state: GameState): readonly FigureView[] {
  const gap = runningGapPctVs(state, BOGLE_NPC_ID)
  const position = state.shares * currentPrice(state)
  return [
    { label: 'Cash', value: formatMoney(state.cash) },
    {
      label: 'Position',
      value: `${formatShares(state.shares)} sh (${formatMoney(position)})`,
    },
    {
      label: `Vs ${BENCHMARK_NAME}`,
      value: formatSignedPercent(gap),
      direction: gap >= 0 ? 'up' : 'down',
    },
  ]
}

export function commentaryFor(state: GameState): string | undefined {
  const text = commentaryText(state.commentaryKey)
  return text === '' ? undefined : text
}

export function cashOutAction(state: GameState): ActionView {
  return canCashOut(state)
    ? { label: 'Cash out now', enabled: true }
    : { label: `Cash out (unlocks day ${MIN_SCORING_DAYS})`, enabled: false }
}

export function complexityFor(state: GameState): string {
  return complexityLabel(indicatorChips(state).length)
}

export function indicatorTiers(state: GameState): readonly IndicatorTierView[] {
  return INDICATOR_TIERS.map((tier) => ({
    name: tier.name,
    items: tier.items.map((item) => ({
      key: item.key,
      label: item.label,
      checked: state.indicators[item.key],
    })),
  }))
}

export function realismSwitches(state: GameState): readonly SwitchItemView[] {
  return REALISM_SWITCHES.map((item) => ({
    key: item.key,
    label: item.label,
    checked: state.settings[item.key],
  }))
}

function describeOrder(order: PendingOrder): string {
  if (order.orderType === 'market') return `${order.side} market`
  return `${order.side} ${order.orderType} at ${order.targetPrice?.toFixed(2) ?? 'no price'}`
}

export function pendingOrders(state: GameState): readonly PendingOrderView[] {
  return state.pending.map((order) => ({ id: order.id, description: describeOrder(order) }))
}

export interface EndScreenView {
  heading: string
  edge: string
  won: boolean
  verdict: string
  scores: readonly FigureView[]
  continueAction: ActionView
}

const WON_VERDICT =
  "A small win over a short horizon happens more than you'd think. Keep going and the odds start working against you again."
const LOST_VERDICT =
  'Most players lose to a patient buy-and-hold benchmark. You are now most players. There is some comfort in that, probably.'

function continueAction(state: GameState, won: boolean): ActionView {
  if (!won) return { label: 'Continue (only available when winning)', enabled: false }
  if (!hasRoomToContinue(state)) {
    return { label: 'Out of history to continue into', enabled: false }
  }
  return { label: 'Continue this run', enabled: canContinue(state) }
}

export function endScreenView(state: GameState): EndScreenView {
  const edge = edgeBpsVs(state, BOGLE_NPC_ID)
  const won = edge >= 0
  const totalReturn = totalReturnPct(state)
  return {
    heading: won ? `You beat the ${BENCHMARK_NAME}` : `The ${BENCHMARK_NAME} wins this one`,
    edge: formatBasisPoints(edge),
    won,
    verdict: won ? WON_VERDICT : LOST_VERDICT,
    scores: [
      { label: 'Total return', value: formatPercent(totalReturn) },
      { label: 'Max drawdown', value: formatPercent(state.maxDrawdownPct * 100) },
      { label: 'Trades placed', value: String(state.tradeCount) },
      { label: 'Tax + fees paid', value: formatMoney(state.taxPaid + state.feesPaid) },
    ],
    continueAction: continueAction(state, won),
  }
}

export const START_SCREEN_COPY = {
  heading: 'Think you can beat the market?',
  lede: `Trade a real, randomized slice of market history. Calendar dates and price levels are hidden, so no peeking at "oh, it's 2008." At the end, we compare you to the ${BENCHMARK_NAME}: a disciplined buy-and-hold benchmark that never panics and never skips a dividend.`,
  footnote: 'Scores are not saved anywhere yet; this build is index mode only.',
} as const

export const BRAND = "Don't Time The Market"
