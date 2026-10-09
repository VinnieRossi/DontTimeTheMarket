import { describe, expect, it } from 'vitest'
import { buildChartData, type ChartSeriesRole } from './chart-series'
import { DEFAULT_INDICATORS } from './indicators'
import { CHART_WINDOW_DAYS } from './rules'
import type { GameState } from './state'
import { buyAndFill, freshRun, sellAndFill, tickTimes } from './test-support'

function roles(state: GameState): ChartSeriesRole[] {
  return buildChartData(state).series.map((series) => series.role)
}

describe('buildChartData', () => {
  it('always draws the benchmark, the price, and the player, in that order', () => {
    expect(roles(freshRun(6))).toEqual(['benchmark', 'price', 'player'])
  })

  it('rebases every line so day one reads 100 and the real index level stays hidden', () => {
    const data = buildChartData(freshRun(6))
    for (const series of data.series) {
      expect(series.points[0]?.value, series.role).toBeCloseTo(100, 6)
    }
  })

  it('counts days from the run start rather than from the series', () => {
    const data = buildChartData(tickTimes(freshRun(6), 5))
    expect(data.series[0]?.points.map((point) => point.day)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('shows at most the chart window, however long the run has been going', () => {
    const data = buildChartData(tickTimes(freshRun(6), CHART_WINDOW_DAYS + 40))
    expect(data.series[0]?.points).toHaveLength(CHART_WINDOW_DAYS + 1)
  })

  it('adds the moving averages only while they are switched on', () => {
    const state = tickTimes(freshRun(6), 60)
    const withSma: GameState = { ...state, indicators: { ...DEFAULT_INDICATORS, sma: true } }
    expect(roles(withSma)).toEqual(['benchmark', 'price', 'player', 'sma20', 'sma50'])
  })

  it('adds the Bollinger bands only while they are switched on', () => {
    const state = tickTimes(freshRun(6), 60)
    const withBands: GameState = { ...state, indicators: { ...DEFAULT_INDICATORS, bb: true } }
    expect(roles(withBands)).toEqual([
      'benchmark',
      'price',
      'player',
      'bollingerUpper',
      'bollingerLower',
    ])
  })

  it('leaves out an overlay point for a day that has no window behind it yet', () => {
    const early: GameState = { ...freshRun(6), indicators: { ...DEFAULT_INDICATORS, sma: true } }
    const data = buildChartData({ ...early, startDay: 0, day: 0 })
    const sma50 = data.series.find((series) => series.role === 'sma50')
    expect(sma50?.points).toEqual([])
  })

  it('marks each filled trade at the price it filled at', () => {
    const traded = sellAndFill(buyAndFill(freshRun(6), 3000), 1)
    const data = buildChartData(traded)
    expect(data.markers.map((marker) => marker.side)).toEqual(['buy', 'sell'])
    for (const marker of data.markers) {
      expect(marker.value).toBeGreaterThan(0)
    }
  })

  it('drops a marker that has scrolled off the left of the window', () => {
    const traded = tickTimes(buyAndFill(freshRun(6), 3000), CHART_WINDOW_DAYS + 20)
    expect(buildChartData(traded).markers).toEqual([])
  })

  it('carries the last known value forward on a day with no history entry', () => {
    const state = tickTimes(freshRun(6), 10)
    const gapped: GameState = {
      ...state,
      valueHistory: state.valueHistory.filter((entry) => entry.day !== state.day),
    }
    const player = buildChartData(gapped).series.find((series) => series.role === 'player')
    const points = player?.points ?? []
    expect(points.at(-1)?.value).toBeCloseTo(points.at(-2)?.value ?? 0, 10)
  })
})
