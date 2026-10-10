import { macro, macroAt, maybeCloseAt } from './market-data'
import { macdFromMomentum, rsiFromMomentum } from './momentum'
import type { MomentumState } from './state'
import { approximateAtr, type PriceAt } from './technicals'

/**
 * The optional readouts a player can pile onto the screen. They are grouped into tiers by how
 * far they sit from the price itself, and the game's joke is that none of them helps: the
 * benchmark does nothing at all and still wins.
 */
export interface IndicatorToggles {
  sma: boolean
  volume: boolean
  rsi: boolean
  macd: boolean
  bb: boolean
  atr: boolean
  vix: boolean
  yieldCurve: boolean
  cpi: boolean
  unemployment: boolean
  fedFunds: boolean
  m2: boolean
}

export const DEFAULT_INDICATORS: IndicatorToggles = {
  sma: false,
  volume: false,
  rsi: false,
  macd: false,
  bb: false,
  atr: false,
  vix: false,
  yieldCurve: false,
  cpi: false,
  unemployment: false,
  fedFunds: false,
  m2: false,
}

/** One readout as the screen shows it: a label and an already formatted value, never a color. */
export interface IndicatorChip {
  key: string
  label: string
  value: string
}

function formatted(value: number | undefined, render: (value: number) => string): string {
  return value === undefined ? 'n/a' : render(value)
}

/** The fields a run has to carry for its readouts to be computable. */
export interface IndicatorHost {
  day: number
  indicators: IndicatorToggles
  momentum: MomentumState
}

/**
 * The chips for whatever is switched on, in tier order. The engine formats them because the
 * numbers come from the simulation and a component that formatted them would need the series to
 * do it; what a chip looks like is still decided entirely by the component that renders it.
 *
 * The series the price-based readouts are computed over arrives as an accessor, because it is the
 * index price in an index run and the portfolio's own value in a portfolio run. The macro
 * readouts take no accessor at all: they are keyed by the simulated day, so they read the same in
 * either kind of run.
 */
export function indicatorChips(state: IndicatorHost, priceAt: PriceAt): IndicatorChip[] {
  const chips: IndicatorChip[] = []
  const active = state.indicators
  const day = state.day

  if (active.volume) {
    // The baked series is close only and carries no real volume figure, so this is a clearly
    // labeled illustrative read rather than a data point anybody should trade on.
    const synthetic = 500_000 + ((day * 9301 + 49297) % 2_000_000)
    chips.push({
      key: 'volume',
      label: 'Volume (illustrative)',
      value: synthetic.toLocaleString('en-US'),
    })
  }
  if (active.rsi) {
    chips.push({ key: 'rsi', label: 'RSI (14)', value: rsiFromMomentum(state.momentum).toFixed(1) })
  }
  if (active.macd) {
    chips.push({ key: 'macd', label: 'MACD', value: macdFromMomentum(state.momentum).toFixed(2) })
  }
  if (active.atr) {
    const atr = approximateAtr(priceAt, day)
    chips.push({
      key: 'atr',
      label: 'ATR (volatility)',
      value: formatted(atr ?? undefined, (value) => value.toFixed(2)),
    })
  }
  if (active.vix) {
    chips.push({
      key: 'vix',
      label: 'Volatility index',
      value: formatted(macroAt(macro.vix, day), (value) => value.toFixed(1)),
    })
  }
  if (active.yieldCurve) {
    const tenYear = macroAt(macro.dgs10, day)
    const twoYear = macroAt(macro.dgs2, day)
    const spread = tenYear === undefined || twoYear === undefined ? undefined : tenYear - twoYear
    chips.push({
      key: 'yieldCurve',
      label: 'Yield curve 10y-2y',
      value: formatted(spread, (value) => `${value.toFixed(2)}%`),
    })
  }
  if (active.cpi) {
    chips.push({
      key: 'cpi',
      label: 'CPI index',
      value: formatted(macroAt(macro.cpi, day), (value) => value.toFixed(1)),
    })
  }
  if (active.unemployment) {
    chips.push({
      key: 'unemployment',
      label: 'Unemployment',
      value: formatted(macroAt(macro.unemployment, day), (value) => `${value.toFixed(1)}%`),
    })
  }
  if (active.fedFunds) {
    chips.push({
      key: 'fedFunds',
      label: 'Fed funds rate',
      value: formatted(macroAt(macro.fedFunds, day), (value) => `${value.toFixed(2)}%`),
    })
  }
  if (active.m2) {
    chips.push({
      key: 'm2',
      label: 'M2 money supply',
      value: formatted(macroAt(macro.m2, day), (value) => value.toFixed(0)),
    })
  }

  return chips
}

export const COMPLEXITY_LABELS: readonly [string, ...string[]] = [
  'Clean',
  'Busy',
  'Overkill',
  'Pretty Dense',
  'Full Terminal Mode',
]

/** The joke label for how cluttered the screen has become, by how many chips are showing. */
export function complexityLabel(chipCount: number): string {
  const level = Math.min(COMPLEXITY_LABELS.length - 1, Math.floor(chipCount / 2.5))
  return COMPLEXITY_LABELS[level] ?? COMPLEXITY_LABELS[0]
}

/** The readouts of an index run, whose price-based indicators read the baked index series. */
export function indexIndicatorChips(state: IndicatorHost): IndicatorChip[] {
  return indicatorChips(state, maybeCloseAt)
}
