import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nasdaq from '../packages/shared/engine/data/baked/nasdaq.json' with { type: 'json' }
import { fetchStockHistory, type StockHistory } from './lib/bake-sources'
import { heading, info, pass } from './lib/proc'

/**
 * The benchmark NPC series bake. Run it by hand with `pnpm bake-npc-series`.
 *
 * It fetches real daily history for the three external benchmark NPCs (the S&P 500 via SPY, the
 * Nasdaq-100 via QQQ, and Berkshire Hathaway via BRK.A) and writes them to the engine package's
 * committed data directory, aligned onto the same trading-day grid `nasdaq.json` uses. The
 * deployed app never calls out for this data: a run plays against the committed file, which is
 * what makes a seed reproducible years later.
 *
 * Stooq's CSV endpoint was tried first and now serves a JS proof-of-work challenge instead of
 * plain CSV, so this reads Yahoo only, through the same `fetchStockHistory` the stock bake uses.
 */

const OUT_DIR = path.resolve(
  import.meta.dirname,
  '..',
  'packages',
  'shared',
  'engine',
  'data',
  'baked'
)

const dates: readonly string[] = nasdaq.dates

interface SeriesDefinition {
  id: string
  ticker: string
}

const SERIES_DEFINITIONS: readonly SeriesDefinition[] = [
  { id: 'sp500', ticker: 'SPY' },
  { id: 'nasdaq100', ticker: 'QQQ' },
  { id: 'berkshire', ticker: 'BRK.A' },
]

/** Five significant digits, matching the precision the rest of the baked data is rounded to. */
function compact(value: number): number {
  return Number(value.toPrecision(5))
}

interface BakedSeries {
  close: (number | null)[]
  dividends: [number, number][]
}

/**
 * Lays a ticker's real trading sessions onto the full grid `nasdaq.json` uses, carrying the last
 * known close forward for any day the grid has and the ticker does not (a different exchange
 * holiday, a brief gap). Unlike `bake-stocks.ts`'s `alignToGrid`, a day before the ticker's own
 * first print is left `null` rather than backfilled or rejected: there is no price to show before
 * the instrument existed, and leaving it `null` is what lets the engine detect that a run's start
 * day predates this NPC's data with no separate metadata lookup.
 */
function alignToFullGrid(history: StockHistory): (number | null)[] {
  const byDate = new Map(history.days.map((day) => [day.date, day.close]))
  const sorted = history.days.map((day) => day.date)
  const aligned: (number | null)[] = []
  let lastKnown: number | null = null
  let cursor = 0

  for (const date of dates) {
    while (cursor < sorted.length) {
      const sourceDate = sorted[cursor]
      if (sourceDate === undefined || sourceDate > date) break
      lastKnown = byDate.get(sourceDate) ?? lastKnown
      cursor += 1
    }
    aligned.push(lastKnown === null ? null : compact(lastKnown))
  }
  return aligned
}

/** Dividend ex-dates placed on the first grid day at or after each one, as absolute day indices. */
function alignDividends(history: StockHistory): [number, number][] {
  const events: [number, number][] = []
  let cursor = 0
  for (const dividend of history.dividends) {
    while (cursor < dates.length && (dates[cursor] ?? '') < dividend.date) cursor += 1
    if (cursor >= dates.length) break
    events.push([cursor, compact(dividend.amount)])
  }
  return events
}

async function bakeSeries(definition: SeriesDefinition): Promise<BakedSeries> {
  heading(`Fetching ${definition.ticker} (${definition.id})`)

  const window = {
    from: Math.floor(Date.parse('1978-01-01T00:00:00Z') / 1000),
    to: Math.floor(Date.parse(`${dates[dates.length - 1]}T23:59:59Z`) / 1000),
  }

  const history = await fetchStockHistory(definition.ticker, window.from, window.to)
  if (history === null) throw new Error(`${definition.ticker} returned nothing`)

  const close = alignToFullGrid(history)
  const dividends = alignDividends(history)
  const firstIndex = close.findIndex((value) => value !== null)
  const firstDate = firstIndex === -1 ? 'never' : dates[firstIndex]
  info(`first real print at ${firstDate} (day index ${firstIndex})`)
  info(`${dividends.length} dividend events captured`)

  return { close, dividends }
}

async function main(): Promise<void> {
  heading(`Baking external NPC series over ${dates.length} trading days`)

  const series: Record<string, BakedSeries> = {}
  for (const definition of SERIES_DEFINITIONS) {
    series[definition.id] = await bakeSeries(definition)
  }

  await mkdir(OUT_DIR, { recursive: true })
  const payload = JSON.stringify(series)
  await writeFile(path.join(OUT_DIR, 'npc-series.json'), payload)
  pass(`Wrote external NPC series to ${OUT_DIR}`)
}

await main()
