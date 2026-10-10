import { FEE_BPS, LONG_TERM_DAYS, SHARE_EPSILON, TAX_LONG_RATE, TAX_SHORT_RATE } from './rules'
import type { RealismSettings } from './settings'
import type { Lot } from './state'

/**
 * What a trade costs, independent of what is being traded.
 *
 * Index runs hold one position and portfolio runs hold several, but a fill is a fill: the spread
 * is the same haircut, the lots come off oldest first, and a lot held past a year is taxed at the
 * long-term rate either way. Those rules live here once so the two kinds of run cannot come to
 * disagree about what the same trade costs.
 */

/** The spread cost of moving `amountUsd`, modeled as a flat basis-point haircut per trade. */
export function feeFor(amountUsd: number, settings: RealismSettings): number {
  return settings.fees ? amountUsd * (FEE_BPS / 10000) : 0
}

export interface LotConsumption {
  remainingLots: Lot[]
  shortGain: number
  longGain: number
}

/**
 * Takes `qty` shares off the oldest lots first. FIFO is what decides the tax: a lot held longer
 * than a year is taxed at the long-term rate, so which shares are sold is not a bookkeeping
 * detail but the difference between two tax bills.
 */
export function consumeLots(
  lots: readonly Lot[],
  qty: number,
  price: number,
  day: number
): LotConsumption {
  const remainingLots: Lot[] = []
  let remaining = qty
  let shortGain = 0
  let longGain = 0

  for (const lot of lots) {
    if (remaining <= SHARE_EPSILON) {
      remainingLots.push({ ...lot })
      continue
    }
    const taken = Math.min(lot.qty, remaining)
    const gain = (price - lot.cost) * taken
    if (day - lot.day > LONG_TERM_DAYS) longGain += gain
    else shortGain += gain
    remaining -= taken
    const left = lot.qty - taken
    if (left > SHARE_EPSILON) remainingLots.push({ ...lot, qty: left })
  }

  return { remainingLots, shortGain, longGain }
}

/**
 * The tax on a realized sale. A loss on one holding does not offset a gain on another here: the
 * simulation taxes each sale on its own, which is a deliberate simplification of real loss
 * harvesting rather than a model of it.
 */
export function taxFor(shortGain: number, longGain: number, settings: RealismSettings): number {
  if (!settings.tax) return 0
  let tax = 0
  if (shortGain > 0) tax += shortGain * TAX_SHORT_RATE
  if (longGain > 0) tax += longGain * TAX_LONG_RATE
  return tax
}

/** How a day's value moves the peak and the worst drawdown a run has seen. */
export interface DrawdownState {
  peakValue: number
  maxDrawdownPct: number
}

export function advanceDrawdown(current: DrawdownState, value: number): DrawdownState {
  const peakValue = Math.max(current.peakValue, value)
  return {
    peakValue,
    maxDrawdownPct: Math.min(current.maxDrawdownPct, (value - peakValue) / peakValue),
  }
}
