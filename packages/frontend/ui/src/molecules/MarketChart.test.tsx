import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketChart } from './MarketChart'

/**
 * The charting library paints onto a canvas, which the test renderer does not have, so it is
 * substituted here and the assertions are about what the component asked it to draw: one line per
 * role, dashed where the design says dashed, markers only on the player's line. What the drawing
 * actually looks like is covered where a real browser is doing the rendering, by the story and its
 * visual baseline.
 */
const chart = {
  addSeries: vi.fn(),
  removeSeries: vi.fn(),
  applyOptions: vi.fn(),
  remove: vi.fn(),
  timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
}

const markersPlugin = { setMarkers: vi.fn() }

function line() {
  return { setData: vi.fn() }
}

vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => chart),
  createSeriesMarkers: vi.fn(() => markersPlugin),
  LineSeries: 'line-series',
}))

beforeEach(() => {
  vi.clearAllMocks()
  chart.addSeries.mockImplementation(line)
  chart.timeScale.mockImplementation(() => ({ fitContent: vi.fn() }))
})

describe('MarketChart', () => {
  it('draws one line per series it was handed', () => {
    render(
      <MarketChart
        series={[
          { role: 'price', points: [{ day: 0, value: 100 }] },
          { role: 'player', points: [{ day: 0, value: 100 }] },
        ]}
      />
    )
    expect(chart.addSeries).toHaveBeenCalledTimes(2)
  })

  it('dashes the benchmark and leaves the price solid, which is how the key reads', () => {
    render(
      <MarketChart
        series={[
          { role: 'price', points: [] },
          { role: 'benchmark', points: [] },
        ]}
      />
    )
    const styles = chart.addSeries.mock.calls.map(([, options]) => options)
    expect(styles[0]).toMatchObject({ lineStyle: 0, lastValueVisible: false })
    expect(styles[1]).toMatchObject({ lineStyle: 2 })
  })

  it('shows the latest value for the player and for nobody else', () => {
    render(
      <MarketChart
        series={[
          { role: 'player', points: [] },
          { role: 'benchmark', points: [] },
        ]}
      />
    )
    const styles = chart.addSeries.mock.calls.map(([, options]) => options)
    expect(styles[0]).toMatchObject({ lastValueVisible: true })
    expect(styles[1]).toMatchObject({ lastValueVisible: false })
  })

  it('puts the trade markers on the player line, below a buy and above a sell', () => {
    render(
      <MarketChart
        series={[{ role: 'player', points: [{ day: 0, value: 100 }] }]}
        markers={[
          { day: 1, value: 101, side: 'buy' },
          { day: 2, value: 99, side: 'sell' },
        ]}
      />
    )
    expect(markersPlugin.setMarkers).toHaveBeenCalledTimes(1)
    const [placed] = markersPlugin.setMarkers.mock.calls[0] ?? []
    expect(placed).toMatchObject([
      { position: 'belowBar', shape: 'arrowUp', text: 'Buy' },
      { position: 'aboveBar', shape: 'arrowDown', text: 'Sell' },
    ])
  })

  it('removes a line the caller stopped asking for', () => {
    const { rerender } = render(
      <MarketChart
        series={[
          { role: 'price', points: [] },
          { role: 'sma20', points: [] },
        ]}
      />
    )
    rerender(<MarketChart series={[{ role: 'price', points: [] }]} />)
    expect(chart.removeSeries).toHaveBeenCalledTimes(1)
  })

  it('tears the chart down when it goes away, so a remount does not leak one', () => {
    const { unmount } = render(<MarketChart series={[{ role: 'price', points: [] }]} />)
    expect(screen.getByTestId('market-chart')).toBeInTheDocument()
    unmount()
    expect(chart.remove).toHaveBeenCalledTimes(1)
  })
})
