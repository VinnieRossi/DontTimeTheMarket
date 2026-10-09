import { describe, expect, it } from 'vitest'
import {
  COMPLEXITY_LABELS,
  complexityLabel,
  DEFAULT_INDICATORS,
  indicatorChips,
} from './indicators'
import type { GameState } from './state'
import { freshRun, tickTimes } from './test-support'

function withEvery(state: GameState): GameState {
  const indicators = { ...DEFAULT_INDICATORS }
  for (const key of Object.keys(indicators) as (keyof typeof indicators)[]) {
    indicators[key] = true
  }
  return { ...state, indicators }
}

describe('indicatorChips', () => {
  it('shows nothing while nothing is switched on', () => {
    expect(indicatorChips(freshRun(4))).toEqual([])
  })

  it('shows one chip per switched-on readout that has a chip, each with a value', () => {
    const chips = indicatorChips(withEvery(tickTimes(freshRun(4), 40)))
    // Moving averages and Bollinger bands draw on the chart rather than as a chip.
    expect(chips.map((chip) => chip.key)).toEqual([
      'volume',
      'rsi',
      'macd',
      'atr',
      'vix',
      'yieldCurve',
      'cpi',
      'unemployment',
      'fedFunds',
      'm2',
    ])
    for (const chip of chips) {
      expect(chip.label, chip.key).toMatch(/\S/)
      expect(chip.value, chip.key).toMatch(/\S/)
    }
  })

  it('says so rather than inventing a number when a series cannot answer for the day', () => {
    const offSeries = withEvery({ ...freshRun(4), day: -1 })
    const values = new Map(indicatorChips(offSeries).map((chip) => [chip.key, chip.value]))
    expect(values.get('vix')).toBe('n/a')
    expect(values.get('yieldCurve')).toBe('n/a')
    expect(values.get('cpi')).toBe('n/a')
    expect(values.get('atr')).toBe('n/a')
  })

  it('reports the yield curve as a spread between the two baked rates', () => {
    const chips = indicatorChips({
      ...withEvery(freshRun(4)),
      indicators: { ...DEFAULT_INDICATORS, yieldCurve: true },
    })
    expect(chips).toHaveLength(1)
    expect(chips[0]?.value).toMatch(/^-?\d+\.\d\d%$/)
  })
})

describe('complexityLabel', () => {
  it('starts clean and ends at the loudest label it has', () => {
    expect(complexityLabel(0)).toBe(COMPLEXITY_LABELS[0])
    expect(complexityLabel(99)).toBe(COMPLEXITY_LABELS[COMPLEXITY_LABELS.length - 1])
  })

  it('climbs as chips pile up', () => {
    const climb = [0, 3, 5, 8, 11].map(complexityLabel)
    expect(new Set(climb).size).toBe(climb.length)
  })
})
