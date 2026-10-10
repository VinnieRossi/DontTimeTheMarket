import { type GameState, MIN_SCORING_DAYS, STARTING_CASH, startRun, step } from '@dttm/engine'
import { describe, expect, it } from 'vitest'
import {
  cashOutAction,
  chartView,
  commentaryFor,
  complexityFor,
  dayLabel,
  endScreenView,
  indicatorTiers,
  legendFor,
  pendingOrders,
  readoutsFor,
  realismSwitches,
  SPEED_CHOICES,
  tilesFor,
  toIndicatorKey,
  toSettingKey,
} from './game-view'

const SEED = 31_337

function tick(state: GameState, days: number): GameState {
  let next = state
  for (let day = 0; day < days; day++) next = step(next, { type: 'TICK' })
  return next
}

function ended(overrides: Partial<GameState> = {}): GameState {
  const scorable = tick(startRun(SEED, 'standard'), MIN_SCORING_DAYS)
  return { ...step(scorable, { type: 'CASH_OUT' }), ...overrides }
}

describe('the clock', () => {
  it('counts the day a player is on, one based, against the horizon', () => {
    expect(dayLabel(startRun(SEED, 'short'))).toBe('Day 1 / 252')
    expect(dayLabel(tick(startRun(SEED, 'short'), 4))).toBe('Day 5 / 252')
  })

  it('offers every speed the engine has, with the stopped one named rather than abbreviated', () => {
    expect(SPEED_CHOICES.map((choice) => choice.label)).toEqual(['Pause', '1x', '4x', '16x'])
  })
})

describe('the chart', () => {
  it('hands the component the series the engine built, needing no mapping between them', () => {
    const view = chartView(startRun(SEED, 'standard'))
    expect(view.series.map((line) => line.role)).toEqual(['benchmark', 'price', 'player'])
    expect(view.markers).toEqual([])
  })

  it('names only the lines that are actually drawn', () => {
    const state = startRun(SEED, 'standard')
    expect(legendFor(state).map((item) => item.role)).toEqual(['price', 'player', 'benchmark'])

    const withOverlays = step(step(state, { type: 'SET_INDICATOR', key: 'sma', value: true }), {
      type: 'SET_INDICATOR',
      key: 'bb',
      value: true,
    })
    expect(legendFor(withOverlays).map((item) => item.role)).toEqual([
      'price',
      'player',
      'benchmark',
      'sma20',
      'sma50',
      'bollingerUpper',
    ])
  })
})

describe('the figures beside the chart', () => {
  it('opens with all the cash, no position, and no gap against the benchmark', () => {
    const tiles = tilesFor(startRun(SEED, 'standard'))
    expect(tiles.slice(0, 3).map((tile) => tile.value)).toEqual([
      '$10,000',
      '0.00 sh ($0)',
      '+0.0%',
    ])
    expect(tiles[2]?.direction).toBe('up')
  })

  it('appends a figure for every external benchmark NPC the start day has data for', () => {
    const tiles = tilesFor(startRun(SEED, 'standard'))
    expect(tiles.slice(3).map((tile) => tile.label)).toEqual(['S&P 500 NPC', 'Berkshire NPC'])
    expect(tiles.slice(3).every((tile) => tile.note !== undefined)).toBe(true)
  })

  it('colors the gap red once the benchmark is ahead', () => {
    const behind: GameState = { ...startRun(SEED, 'standard'), cash: 1, shares: 0 }
    expect(tilesFor(behind)[2]).toMatchObject({ value: '-100.0%', direction: 'down' })
  })

  it('shows no readouts and the cleanest label until something is switched on', () => {
    const state = startRun(SEED, 'standard')
    expect(readoutsFor(state)).toEqual([])
    expect(complexityFor(readoutsFor(state))).toBe('Clean')
  })

  it('reports the readouts a player piled on, and says how cluttered that got', () => {
    let state = startRun(SEED, 'standard')
    for (const key of ['rsi', 'macd', 'vix', 'cpi', 'm2', 'fedFunds'] as const) {
      state = step(state, { type: 'SET_INDICATOR', key, value: true })
    }
    expect(readoutsFor(state)).toHaveLength(6)
    expect(complexityFor(readoutsFor(state))).toBe('Overkill')
  })

  it('says nothing at all when the engine has not picked a line', () => {
    expect(commentaryFor(startRun(SEED, 'standard'))).toBeUndefined()
  })

  it('renders the line for whichever key the engine picked', () => {
    const talking: GameState = { ...startRun(SEED, 'standard'), commentaryKey: 'cash-2' }
    expect(commentaryFor(talking)).toBe('The Bogle NPC is out here working. You are not.')
  })
})

describe('cashing out', () => {
  it('is locked, and says when it unlocks, until the sample is long enough to score', () => {
    expect(cashOutAction(startRun(SEED, 'standard'))).toEqual({
      label: `Cash out (unlocks day ${MIN_SCORING_DAYS})`,
      enabled: false,
    })
  })

  it('unlocks once it is scorable', () => {
    const scorable = tick(startRun(SEED, 'standard'), MIN_SCORING_DAYS)
    expect(cashOutAction(scorable)).toEqual({ label: 'Cash out now', enabled: true })
  })
})

describe('pending orders', () => {
  it('writes out a market order without a price it does not have', () => {
    const placed = step(startRun(SEED, 'standard'), {
      type: 'PLACE_ORDER',
      order: { side: 'buy', orderType: 'market', amountUsd: 100 },
    })
    expect(pendingOrders(placed)).toEqual([{ id: 1, description: 'buy market' }])
  })

  it('writes out the price a trigger order is waiting for', () => {
    const placed = step(startRun(SEED, 'standard'), {
      type: 'PLACE_ORDER',
      order: { side: 'sell', orderType: 'stop', qty: 1, targetPrice: 94.2 },
    })
    expect(pendingOrders(placed)).toEqual([{ id: 1, description: 'sell stop at 94.20' }])
  })
})

describe('the switch lists', () => {
  it('groups every readout into a tier and reports which are on', () => {
    const state = step(startRun(SEED, 'standard'), {
      type: 'SET_INDICATOR',
      key: 'rsi',
      value: true,
    })
    const tiers = indicatorTiers(state)
    expect(tiers).toHaveLength(4)
    const rsi = tiers.flatMap((tier) => tier.items).find((item) => item.key === 'rsi')
    expect(rsi).toEqual({ key: 'rsi', label: 'RSI (14)', checked: true })
  })

  it("reports the realism switches with the engine's own defaults", () => {
    expect(realismSwitches(startRun(SEED, 'standard'))).toEqual([
      { key: 'fees', label: 'Trading fees & spread (3 bps)', checked: true },
      { key: 'tax', label: 'Capital gains tax', checked: true },
      { key: 'interest', label: 'Interest on idle cash', checked: true },
      { key: 'reinvestDividends', label: 'Auto-reinvest my dividends', checked: false },
    ])
  })

  it('turns a key a screen reported back into one the engine takes, and refuses anything else', () => {
    expect(toIndicatorKey('rsi')).toBe('rsi')
    expect(toIndicatorKey('not-an-indicator')).toBeUndefined()
    expect(toSettingKey('tax')).toBe('tax')
    expect(toSettingKey('cheat-mode')).toBeUndefined()
  })
})

describe('the scoreboard', () => {
  it('congratulates a run that beat the benchmark and offers it another', () => {
    const view = endScreenView(ended({ cash: STARTING_CASH * 4, shares: 0 }))
    expect(view.won).toBe(true)
    expect(view.heading).toBe('You beat the Bogle NPC')
    expect(view.edge.startsWith('+')).toBe(true)
    expect(view.continueAction).toEqual({ label: 'Continue this run', enabled: true })
  })

  it('refuses a continue to a run the benchmark won', () => {
    const view = endScreenView(ended({ cash: 1, shares: 0 }))
    expect(view.won).toBe(false)
    expect(view.heading).toBe('The Bogle NPC wins this one')
    expect(view.continueAction).toEqual({
      label: 'Continue (only available when winning)',
      enabled: false,
    })
  })

  it('says so when a winning run has run out of history to continue into', () => {
    // Far enough into the series that another run length would read past the end of it, and
    // holding enough cash that the benchmark's own compounding over those years is still behind.
    const view = endScreenView(ended({ cash: 50_000_000, shares: 0, day: 13_400 }))
    expect(view.continueAction).toEqual({
      label: 'Out of history to continue into',
      enabled: false,
    })
  })

  it('reports the four figures a run is judged on, plus one per external NPC this run has', () => {
    const view = endScreenView(ended())
    expect(view.scores.map((score) => score.label)).toEqual([
      'Total return',
      'Max drawdown',
      'Trades placed',
      'Tax + fees paid',
      'S&P 500 NPC',
      'Berkshire NPC',
    ])
    expect(view.scores[0]?.value).toMatch(/^-?\d+\.\d%$/)
    expect(view.scores[3]?.value.startsWith('$')).toBe(true)
  })
})
