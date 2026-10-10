import type { ChartData, ChartPoint, ChartSeries, ChartTradeMarker } from './chart-series'
import { type IndicatorChip, indicatorChips } from './indicators'
import { recordedValueAt } from './portfolio-selectors'
import type { PortfolioRunState } from './portfolio-state'
import { CHART_WINDOW_DAYS, STARTING_CASH } from './rules'
import { bollingerBands, type PriceAt, sma } from './technicals'

/**
 * What a portfolio run draws.
 *
 * An index run charts the market price with the player's value and the benchmark's over it. A
 * portfolio run has no single market price to chart, so the comparison is the whole picture: the
 * player's basket against the same basket left alone. That is the honest comparison in any case,
 * because both lines start from the player's own allocation and everything separating them
 * afterward is something the player chose to do.
 */

/** Reads the portfolio's recorded value for a day, which is the series everything here plots. */
export function valueAccessor(state: PortfolioRunState): PriceAt {
  return (day) => recordedValueAt(state, day)
}

interface Window {
  start: number
  end: number
  elapsed: (day: number) => number
}

function windowFor(state: PortfolioRunState): Window {
  return {
    start: Math.max(state.startDay, state.day - CHART_WINDOW_DAYS),
    end: state.day,
    elapsed: (day) => day - state.startDay,
  }
}

/** Rebases a value against the starting stake, so every line opens at 100. */
function rebase(value: number): number {
  return (100 * value) / STARTING_CASH
}

function valueSeries(
  state: PortfolioRunState,
  window: Window,
  npcId: string
): [ChartSeries, ChartSeries] {
  const player: ChartSeries = { role: 'player', points: [] }
  const benchmark: ChartSeries = { role: 'benchmark', points: [] }
  let lastPlayer = STARTING_CASH
  let lastBenchmark = STARTING_CASH

  for (let day = window.start; day <= window.end; day++) {
    const entry = state.valueHistory[day - state.startDay]
    if (entry?.day === day) {
      lastPlayer = entry.playerValue
      lastBenchmark = entry.npcValues[npcId] ?? lastBenchmark
    }
    const elapsed = window.elapsed(day)
    player.points.push({ day: elapsed, value: rebase(lastPlayer) })
    benchmark.points.push({ day: elapsed, value: rebase(lastBenchmark) })
  }

  return [benchmark, player]
}

function overlaySeries(state: PortfolioRunState, window: Window): ChartSeries[] {
  const priceAt = valueAccessor(state)
  const series: ChartSeries[] = []

  if (state.indicators.sma) {
    const short: ChartSeries = { role: 'sma20', points: [] }
    const long: ChartSeries = { role: 'sma50', points: [] }
    for (let day = window.start; day <= window.end; day++) {
      const elapsed = window.elapsed(day)
      const over20 = sma(priceAt, day, 20)
      const over50 = sma(priceAt, day, 50)
      if (over20 !== null) short.points.push({ day: elapsed, value: rebase(over20) })
      if (over50 !== null) long.points.push({ day: elapsed, value: rebase(over50) })
    }
    series.push(short, long)
  }

  if (state.indicators.bb) {
    const upper: ChartSeries = { role: 'bollingerUpper', points: [] }
    const lower: ChartSeries = { role: 'bollingerLower', points: [] }
    for (let day = window.start; day <= window.end; day++) {
      const bands = bollingerBands(priceAt, day)
      if (bands === null) continue
      const elapsed = window.elapsed(day)
      upper.points.push({ day: elapsed, value: rebase(bands.upper) })
      lower.points.push({ day: elapsed, value: rebase(bands.lower) })
    }
    series.push(upper, lower)
  }

  return series
}

/**
 * Buys and sells, marked on the player's own value line rather than on a price. A portfolio trade
 * happens to one company at one price, but the line it has to be readable against is the whole
 * portfolio, so the marker sits where the portfolio stood that day.
 */
function tradeMarkers(state: PortfolioRunState, window: Window): ChartTradeMarker[] {
  const from = window.elapsed(window.start)
  const to = window.elapsed(window.end)
  const markers: ChartTradeMarker[] = []
  for (const trade of state.tradeLog) {
    if (trade.day < from || trade.day > to) continue
    const value = recordedValueAt(state, state.startDay + trade.day)
    if (value === undefined) continue
    markers.push({ day: trade.day, value: rebase(value), side: trade.side })
  }
  return markers
}

export function buildPortfolioChartData(state: PortfolioRunState, npcId: string): ChartData {
  const window = windowFor(state)
  const [benchmark, player] = valueSeries(state, window, npcId)
  return {
    series: [benchmark, player, ...overlaySeries(state, window)],
    markers: tradeMarkers(state, window),
  }
}

/** The readouts of a portfolio run, whose price-based indicators read the portfolio's own value. */
export function portfolioIndicatorChips(state: PortfolioRunState): IndicatorChip[] {
  return indicatorChips(state, valueAccessor(state))
}

/**
 * A holding's own price line over the chart window, rebased to 100 at the window's first day, for
 * the sparkline on its row. It is rebased against the window rather than against the run's start
 * so a holding bought yesterday and one held since day one are both readable.
 */
export function holdingSparkline(
  state: PortfolioRunState,
  close: readonly number[],
  firstDay: number
): ChartPoint[] {
  const window = windowFor(state)
  const base = close[window.start - firstDay]
  if (base === undefined || base <= 0) return []
  const points: ChartPoint[] = []
  for (let day = window.start; day <= window.end; day++) {
    const price = close[day - firstDay]
    if (price === undefined) continue
    points.push({ day: window.elapsed(day), value: (100 * price) / base })
  }
  return points
}
