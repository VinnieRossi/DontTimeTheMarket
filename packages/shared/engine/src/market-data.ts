import { InternalError } from '@dttm/types'
import macroRaw from '../data/baked/macro.json' with { type: 'json' }
import nasdaqRaw from '../data/baked/nasdaq.json' with { type: 'json' }

/**
 * The baked market history, committed rather than fetched. `scripts/bake-data.ts` writes these
 * two files from FRED's public CSV endpoint; nothing at runtime contacts FRED, so a run is
 * reproducible from the repository alone and the deployed app has no external dependency.
 *
 * Every series is indexed by the same integer day offset: `macro.cpi[i]` describes the trading
 * day `nasdaq.dates[i]` closed on, which is what lets the engine carry one day index rather than
 * a date per series.
 */

export interface NasdaqSeries {
  readonly dates: readonly string[]
  readonly close: readonly number[]
}

export interface MacroSeries {
  readonly cpi: readonly (number | null)[]
  readonly dgs10: readonly (number | null)[]
  readonly dgs2: readonly (number | null)[]
  readonly dtb3: readonly (number | null)[]
  readonly fedFunds: readonly (number | null)[]
  readonly unemployment: readonly (number | null)[]
  readonly vix: readonly (number | null)[]
  readonly m2: readonly (number | null)[]
}

export const nasdaq: NasdaqSeries = nasdaqRaw
export const macro: MacroSeries = macroRaw

export const SERIES_LENGTH = nasdaq.close.length

/**
 * How many trailing days must remain after a run's start day so that the longest run length
 * (2,520 days) plus a Continue extension of the same length always has room, without ever
 * reading past the end of the baked array.
 */
const TRAILING_MARGIN_DAYS = 2520 * 2 + 30

/** The latest valid absolute index a run may start at. */
export const MAX_START_DAY = SERIES_LENGTH - TRAILING_MARGIN_DAYS
export const MIN_START_DAY = 30

/**
 * The close price on a trading day, by absolute index. Throws rather than returning undefined:
 * every caller inside a run holds an index the run itself produced, so a missing price is a
 * broken invariant rather than a case to render.
 */
export function closeAt(day: number): number {
  const price = nasdaq.close[day]
  if (price === undefined) {
    throw new InternalError(`No price data at day index ${day}`)
  }
  return price
}

/** The close price on a trading day, or undefined past either end of the series. */
export function maybeCloseAt(day: number): number | undefined {
  return nasdaq.close[day]
}

/**
 * A macro reading for a day, or undefined when the series carries no value there. A baked null
 * and an index past the end of the series are the same answer to a caller: there is nothing to
 * show, so both arrive as undefined rather than as two cases every caller has to handle.
 */
export function macroAt(series: readonly (number | null)[], day: number): number | undefined {
  return series[day] ?? undefined
}
