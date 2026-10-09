import {
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  LineSeries,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import type {
  ChartMarkerView,
  ChartPointView,
  ChartSeriesRole,
  ChartSeriesView,
} from '../domain/chart-view'
import { readToken, readTokenPx, tokenOption } from '../lib/tokens'

/**
 * An arbitrary fixed epoch, used only to give the charting library real timestamps to plot
 * against. Elapsed day N always renders as this instant plus N days, and the calendar date it
 * lands on is never shown anywhere: a player who could read the real dates would recognize the
 * period (2008, 2020) and play to an outcome they already know.
 */
const BASE_TIMESTAMP = Date.UTC(2000, 0, 3) / 1000
const SECONDS_PER_DAY = 86_400

/**
 * How many bars of empty space to leave after the last one, so today's point is not drawn against
 * the frame. It is a count of bars rather than a length, which is why it is not a token.
 */
const RIGHT_OFFSET_BARS = 4

/** The one place a series role turns into an appearance, and it names tokens rather than colors. */
interface SeriesStyle {
  token: string
  lineWidth: 1 | 2
  dashed: boolean
  /** Only one line carries its latest value on the price scale: the player's own. */
  showsLastValue: boolean
}

const SERIES_STYLES: Record<ChartSeriesRole, SeriesStyle> = {
  price: { token: '--app-series-price', lineWidth: 2, dashed: false, showsLastValue: false },
  player: { token: '--app-series-player', lineWidth: 2, dashed: false, showsLastValue: true },
  benchmark: { token: '--app-series-benchmark', lineWidth: 2, dashed: true, showsLastValue: false },
  sma20: { token: '--app-series-sma20', lineWidth: 1, dashed: false, showsLastValue: false },
  sma50: { token: '--app-series-sma50', lineWidth: 1, dashed: false, showsLastValue: false },
  bollingerUpper: {
    token: '--app-series-bollinger',
    lineWidth: 1,
    dashed: true,
    showsLastValue: false,
  },
  bollingerLower: {
    token: '--app-series-bollinger',
    lineWidth: 1,
    dashed: true,
    showsLastValue: false,
  },
}

function dayToTime(day: number): UTCTimestamp {
  return (BASE_TIMESTAMP + day * SECONDS_PER_DAY) as UTCTimestamp
}

function timeToDay(time: number): number {
  return Math.round((time - BASE_TIMESTAMP) / SECONDS_PER_DAY)
}

export interface MarketChartProps {
  series: readonly ChartSeriesView[]
  markers?: readonly ChartMarkerView[]
}

/** The options a line is created with, which name tokens rather than carrying colors. */
function lineOptions(role: ChartSeriesRole) {
  const style = SERIES_STYLES[role]
  return {
    ...tokenOption('color', style.token),
    lineWidth: style.lineWidth,
    lineStyle: style.dashed ? 2 : 0,
    priceLineVisible: false,
    lastValueVisible: style.showsLastValue,
  }
}

function toLinePoint(point: ChartPointView): { time: UTCTimestamp; value: number } {
  return { time: dayToTime(point.day), value: point.value }
}

function toMarker(marker: ChartMarkerView): SeriesMarker<Time> {
  const buying = marker.side === 'buy'
  return {
    time: dayToTime(marker.day),
    position: buying ? 'belowBar' : 'aboveBar',
    /*
     * A marker has to carry a color: unlike the line options, the library's type makes it
     * required. An unresolved token therefore falls back to nothing visible rather than to a
     * literal color this file would then own.
     */
    color: readToken(buying ? '--app-marker-buy' : '--app-marker-sell') ?? 'transparent',
    shape: buying ? 'arrowUp' : 'arrowDown',
    text: buying ? 'Buy' : 'Sell',
  }
}

/** Drops the lines the caller has stopped asking for, so a switched-off overlay disappears. */
function dropUnusedLines(
  chart: IChartApi,
  drawn: Map<ChartSeriesRole, ISeriesApi<'Line'>>,
  series: readonly ChartSeriesView[]
): void {
  const active = new Set(series.map((line) => line.role))
  for (const [role, line] of drawn.entries()) {
    if (active.has(role)) continue
    chart.removeSeries(line)
    drawn.delete(role)
  }
}

/**
 * The price chart. It owns no data: it draws the series it is handed and reports nothing back, so
 * the same component renders a live run, a story, and a visual baseline. Its height comes from a
 * token read at mount, because a canvas is sized by a number rather than by a stylesheet.
 */
export function MarketChart({ series, markers = [] }: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Map<ChartSeriesRole, ISeriesApi<'Line'>>>(new Map())
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    const drawn = seriesRef.current

    const height = readTokenPx('--app-chart-height')
    const fontSize = readTokenPx('--app-text-xs')
    const chart = createChart(container, {
      ...(height === undefined ? {} : { height }),
      layout: {
        background: { color: 'transparent' },
        ...tokenOption('textColor', '--app-chart-axis'),
        ...tokenOption('fontFamily', '--app-font-body'),
        ...(fontSize === undefined ? {} : { fontSize }),
      },
      grid: {
        vertLines: { visible: false },
        horzLines: tokenOption('color', '--app-chart-grid'),
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        rightOffset: RIGHT_OFFSET_BARS,
        tickMarkFormatter: (time: number) => `Day ${timeToDay(time) + 1}`,
      },
      crosshair: { mode: 0 },
    })
    chartRef.current = chart

    const fitWidth = (): void => {
      if (containerRef.current !== null) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    fitWidth()
    const observer = new ResizeObserver(fitWidth)
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      drawn.clear()
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (chart === null) return
    const drawn = seriesRef.current
    dropUnusedLines(chart, drawn, series)

    for (const line of series) {
      let drawnLine = drawn.get(line.role)
      if (drawnLine === undefined) {
        drawnLine = chart.addSeries(LineSeries, lineOptions(line.role))
        drawn.set(line.role, drawnLine)
      }
      drawnLine.setData(line.points.map(toLinePoint))

      // The markers belong to the player's own line, because they mark what the player did.
      if (line.role !== 'player') continue
      const plugin = markersRef.current ?? createSeriesMarkers(drawnLine, [])
      markersRef.current = plugin
      plugin.setMarkers(markers.map(toMarker))
    }

    chart.timeScale().fitContent()
  }, [series, markers])

  return <div ref={containerRef} className="app-chart" data-testid="market-chart" />
}
