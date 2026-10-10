import { closeAt, maybeCloseAt } from './market-data'
import { BOGLE_NPC_ID } from './npc'
import { CHART_WINDOW_DAYS, STARTING_CASH } from './rules'
import type { GameState, OrderSide } from './state'
import { bollingerBands, sma } from './technicals'

/**
 * What a line on the chart means, rather than what it looks like. The engine names the role and
 * the component resolves the role to a color and a line style from the design tokens, because a
 * hex value in here would be a visual decision taken where no token can reach it.
 */
export type ChartSeriesRole =
  | 'price'
  | 'player'
  | 'benchmark'
  | 'sma20'
  | 'sma50'
  | 'bollingerUpper'
  | 'bollingerLower'

export interface ChartPoint {
  /** Elapsed trading days since the run started, which is the only time axis the player sees. */
  day: number
  value: number
}

export interface ChartSeries {
  role: ChartSeriesRole
  points: ChartPoint[]
}

export interface ChartTradeMarker {
  day: number
  value: number
  side: OrderSide
}

export interface ChartData {
  series: ChartSeries[]
  markers: ChartTradeMarker[]
}

/** The window the chart covers: the trailing stretch of the run, in absolute day indexes. */
interface Window {
  start: number
  end: number
  /** The run's opening price, which every line is rebased against. */
  basePrice: number
  /** Turns an absolute day index into the elapsed day the chart plots. */
  elapsed: (day: number) => number
  /** Rebases a price so the run opens at 100. */
  rebase: (value: number) => number
}

function windowFor(state: GameState): Window {
  const basePrice = closeAt(state.startDay)
  return {
    start: Math.max(state.startDay, state.day - CHART_WINDOW_DAYS),
    end: state.day,
    basePrice,
    elapsed: (day) => day - state.startDay,
    rebase: (value) => (100 * value) / basePrice,
  }
}

function priceSeries(window: Window): ChartSeries {
  const points: ChartPoint[] = []
  for (let day = window.start; day <= window.end; day++) {
    points.push({ day: window.elapsed(day), value: window.rebase(closeAt(day)) })
  }
  return { role: 'price', points }
}

/**
 * The player's value and the benchmark's, both rebased against the starting cash so they can be
 * read against the price line. A day with no recorded entry carries the last known value forward
 * rather than breaking the line.
 */
function valueSeries(state: GameState, window: Window): [ChartSeries, ChartSeries] {
  const history = new Map(state.valueHistory.map((entry) => [entry.day, entry]))
  const player: ChartSeries = { role: 'player', points: [] }
  const benchmark: ChartSeries = { role: 'benchmark', points: [] }
  let lastPlayer = STARTING_CASH
  let lastBenchmark = STARTING_CASH

  for (let day = window.start; day <= window.end; day++) {
    const entry = history.get(day)
    if (entry !== undefined) {
      lastPlayer = entry.playerValue
      lastBenchmark = entry.npcValues[BOGLE_NPC_ID] ?? lastBenchmark
    }
    const elapsed = window.elapsed(day)
    player.points.push({ day: elapsed, value: (100 * lastPlayer) / STARTING_CASH })
    benchmark.points.push({ day: elapsed, value: (100 * lastBenchmark) / STARTING_CASH })
  }

  return [benchmark, player]
}

function movingAverageSeries(window: Window): ChartSeries[] {
  const short: ChartSeries = { role: 'sma20', points: [] }
  const long: ChartSeries = { role: 'sma50', points: [] }
  for (let day = window.start; day <= window.end; day++) {
    const elapsed = window.elapsed(day)
    const over20 = sma(maybeCloseAt, day, 20)
    const over50 = sma(maybeCloseAt, day, 50)
    if (over20 !== null) short.points.push({ day: elapsed, value: window.rebase(over20) })
    if (over50 !== null) long.points.push({ day: elapsed, value: window.rebase(over50) })
  }
  return [short, long]
}

function bollingerSeries(window: Window): ChartSeries[] {
  const upper: ChartSeries = { role: 'bollingerUpper', points: [] }
  const lower: ChartSeries = { role: 'bollingerLower', points: [] }
  for (let day = window.start; day <= window.end; day++) {
    const bands = bollingerBands(maybeCloseAt, day)
    if (bands === null) continue
    const elapsed = window.elapsed(day)
    upper.points.push({ day: elapsed, value: window.rebase(bands.upper) })
    lower.points.push({ day: elapsed, value: window.rebase(bands.lower) })
  }
  return [upper, lower]
}

function tradeMarkers(state: GameState, window: Window): ChartTradeMarker[] {
  const from = window.elapsed(window.start)
  const to = window.elapsed(window.end)
  return state.tradeLog
    .filter((trade) => trade.day >= from && trade.day <= to)
    .map((trade) => ({
      day: trade.day,
      value: window.rebase(trade.price),
      side: trade.side,
    }))
}

/**
 * Builds the market-price line, the player's value line, the benchmark's value line, whichever
 * overlays are switched on, and the buy and sell markers.
 *
 * Everything is rebased to start at 100 so the real absolute price level stays hidden: a player
 * should judge the shape of the move rather than recognize the index level and work out which
 * historical period they are playing.
 */
export function buildChartData(state: GameState): ChartData {
  const window = windowFor(state)
  const [benchmark, player] = valueSeries(state, window)
  const series: ChartSeries[] = [benchmark, priceSeries(window), player]
  if (state.indicators.sma) series.push(...movingAverageSeries(window))
  if (state.indicators.bb) series.push(...bollingerSeries(window))

  return { series, markers: tradeMarkers(state, window) }
}
