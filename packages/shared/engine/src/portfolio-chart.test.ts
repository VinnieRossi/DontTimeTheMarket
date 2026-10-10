import { describe, expect, it } from 'vitest'
import { BOGLE_NPC_ID } from './npc'
import {
  buildPortfolioChartData,
  holdingSparkline,
  portfolioIndicatorChips,
  valueAccessor,
} from './portfolio-chart'
import { portfolioValue } from './portfolio-selectors'
import { CHART_WINDOW_DAYS, STARTING_CASH } from './rules'
import { step } from './step'
import { freshPortfolioRun, orderAndFill, tickPortfolio } from './test-support'

const SEED = 31_415

describe('buildPortfolioChartData', () => {
  it('charts the player against the benchmark, with no market price line to show', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 40)
    const roles = buildPortfolioChartData(run, BOGLE_NPC_ID).series.map((series) => series.role)
    expect(roles).toEqual(['benchmark', 'player'])
  })

  it('opens both lines at 100, so the real price level stays hidden', () => {
    const run = freshPortfolioRun(SEED, 3)
    const { series } = buildPortfolioChartData(run, BOGLE_NPC_ID)
    for (const line of series) {
      expect(line.points[0]?.value, line.role).toBeCloseTo(100, 6)
      expect(line.points[0]?.day, line.role).toBe(0)
    }
  })

  it('plots the player’s line where the portfolio actually stood', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 30)
    const player = buildPortfolioChartData(run, BOGLE_NPC_ID).series.find(
      (series) => series.role === 'player'
    )
    const last = player?.points[player.points.length - 1]
    expect(last?.value).toBeCloseTo((100 * portfolioValue(run)) / STARTING_CASH, 6)
  })

  it('covers only the trailing window once a run is longer than the chart', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), CHART_WINDOW_DAYS + 120)
    const player = buildPortfolioChartData(run, BOGLE_NPC_ID).series.find(
      (series) => series.role === 'player'
    )
    expect(player?.points).toHaveLength(CHART_WINDOW_DAYS + 1)
  })

  it('adds the overlays that are switched on, over the portfolio’s own line', () => {
    let run = tickPortfolio(freshPortfolioRun(SEED, 3), 80)
    run = step(run, { type: 'SET_INDICATOR', key: 'sma', value: true })
    run = step(run, { type: 'SET_INDICATOR', key: 'bb', value: true })
    const roles = buildPortfolioChartData(run, BOGLE_NPC_ID).series.map((series) => series.role)
    expect(roles).toEqual([
      'benchmark',
      'player',
      'sma20',
      'sma50',
      'bollingerUpper',
      'bollingerLower',
    ])
  })

  it('marks a trade on the portfolio line, which is the line it has to be read against', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 3), 30)
    const holding = run.holdings[0]
    const traded = tickPortfolio(
      orderAndFill(run, {
        side: 'sell',
        assetId: holding?.assetId,
        qty: (holding?.shares ?? 0) / 2,
      }),
      5
    )
    const { markers } = buildPortfolioChartData(traded, BOGLE_NPC_ID)
    expect(markers).toHaveLength(1)
    expect(markers[0]?.side).toBe('sell')
    expect(markers[0]?.value).toBeGreaterThan(0)
  })
})

describe('portfolioIndicatorChips', () => {
  it('shows nothing while nothing is switched on', () => {
    expect(portfolioIndicatorChips(freshPortfolioRun(SEED, 2))).toEqual([])
  })

  it('reads the price-based readouts off the portfolio’s own value line', () => {
    let run = tickPortfolio(freshPortfolioRun(SEED, 3), 60)
    run = step(run, { type: 'SET_INDICATOR', key: 'rsi', value: true })
    run = step(run, { type: 'SET_INDICATOR', key: 'atr', value: true })
    const values = new Map(
      portfolioIndicatorChips(run).map((chip) => [chip.key, chip.value] as const)
    )
    expect(values.get('rsi')).toMatch(/^\d+\.\d$/)
    expect(values.get('atr')).not.toBe('n/a')
  })

  it('says so rather than inventing a number before the window has any history', () => {
    let run = freshPortfolioRun(SEED, 2)
    run = step(run, { type: 'SET_INDICATOR', key: 'atr', value: true })
    expect(portfolioIndicatorChips(run)[0]?.value).toBe('n/a')
  })

  it('answers the macro readouts the same way an index run does, by simulated day', () => {
    let run = tickPortfolio(freshPortfolioRun(SEED, 2), 10)
    run = step(run, { type: 'SET_INDICATOR', key: 'cpi', value: true })
    expect(portfolioIndicatorChips(run)[0]?.value).not.toBe('n/a')
  })
})

describe('valueAccessor', () => {
  it('reads the recorded value for a day and nothing for a day the run never saw', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 2), 10)
    const read = valueAccessor(run)
    expect(read(run.day)).toBeCloseTo(portfolioValue(run), 6)
    expect(read(run.startDay - 1)).toBeUndefined()
  })
})

describe('holdingSparkline', () => {
  it('rebases a holding’s own line to 100 at the start of the window', () => {
    const run = tickPortfolio(freshPortfolioRun(SEED, 2), 40)
    const asset = run.universe.find((entry) => entry.company.id === run.holdings[0]?.assetId)
    const points = holdingSparkline(run, asset?.series.close ?? [], asset?.series.firstDay ?? 0)
    expect(points).toHaveLength(41)
    expect(points[0]?.value).toBeCloseTo(100, 6)
  })

  it('draws nothing for a series that has no price at the start of the window', () => {
    const run = freshPortfolioRun(SEED, 2)
    expect(holdingSparkline(run, [], 0)).toEqual([])
  })
})
