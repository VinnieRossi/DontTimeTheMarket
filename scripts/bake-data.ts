import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { heading, info, pass } from './lib/proc'

/**
 * The data bake. Run it by hand with `pnpm bake-data`.
 *
 * It fetches daily Nasdaq Composite prices and a handful of macro series from FRED's public CSV
 * endpoint, which needs no API key and no account, and writes them to the engine package's
 * committed data directory. The deployed app never calls FRED: a run plays against the files in
 * the repository, which is what makes a seed reproducible years later.
 *
 * Re-run it when the data should be refreshed, for example quarterly. Nothing in CI or at runtime
 * invokes it.
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

const FRED_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv'

interface FredSeries {
  dates: string[]
  values: (number | null)[]
}

async function fetchFredSeries(id: string): Promise<FredSeries> {
  const response = await fetch(`${FRED_BASE}?id=${id}`)
  if (!response.ok) {
    throw new Error(`FRED fetch failed for ${id}: HTTP ${response.status}`)
  }
  const text = await response.text()
  // The first line is a header: "observation_date,<SERIES_ID>".
  const dates: string[] = []
  const values: (number | null)[] = []
  for (const line of text.trim().split('\n').slice(1)) {
    const [date, raw] = line.split(',')
    if (date === undefined || date === '') continue
    dates.push(date)
    values.push(raw === '.' || raw === undefined ? null : Number(raw))
  }
  return { dates, values }
}

/**
 * Aligns a sparser, lower-frequency series onto the daily date grid by carrying the last known
 * value forward, and fills any leading gap with the first known value.
 *
 * This is how a monthly series (CPI, unemployment, Fed funds, M2) and a series that starts later
 * than the price history (VIX, which begins in 1990) end up on the same daily index space as the
 * Nasdaq series, so the engine can address every series by one integer day offset. Filling the
 * lead-in means days before 1990 show 1990's earliest VIX reading rather than a gap: a deliberate,
 * disclosed simplification for a tongue-in-cheek game, not a claim about history before the series
 * existed.
 */
function alignToGrid(targetDates: readonly string[], source: FredSeries): (number | null)[] {
  const byDate = new Map<string, number>()
  for (const [index, date] of source.dates.entries()) {
    const value = source.values[index]
    if (value !== null && value !== undefined) byDate.set(date, value)
  }

  const sourceDates = [...byDate.keys()].sort()
  const aligned: (number | null)[] = []
  let lastKnown: number | null = null
  let cursor = 0
  for (const date of targetDates) {
    while (cursor < sourceDates.length && (sourceDates[cursor] ?? '') <= date) {
      lastKnown = byDate.get(sourceDates[cursor] ?? '') ?? lastKnown
      cursor += 1
    }
    aligned.push(lastKnown)
  }

  const firstKnownIndex = aligned.findIndex((value) => value !== null)
  const firstKnown = firstKnownIndex === -1 ? null : (aligned[firstKnownIndex] ?? null)
  for (let index = 0; index < firstKnownIndex; index++) {
    aligned[index] = firstKnown
  }
  return aligned
}

const MACRO_SERIES_IDS = {
  cpi: 'CPIAUCSL',
  dgs10: 'DGS10',
  dgs2: 'DGS2',
  dtb3: 'DTB3',
  fedFunds: 'FEDFUNDS',
  unemployment: 'UNRATE',
  vix: 'VIXCLS',
  m2: 'M2SL',
} as const

async function main(): Promise<void> {
  heading('Fetching NASDAQCOM (daily, since 1971)')
  const source = await fetchFredSeries('NASDAQCOM')

  /*
   * FRED's NASDAQCOM feed carries two different kinds of gap, not one: "." for an unscheduled
   * missing observation, and a literal 0 on a market holiday that falls on a weekday (verified
   * against the US market holiday calendar: 1971-02-15 Washington's Birthday, 1971-04-09 Good
   * Friday, 1971-09-06 Labor Day, and 484 others like them across the full series). A holiday is
   * not a trading day whose close was zero, so both kinds of gap are dropped the same way and the
   * engine gets a dense array of real trading days with no zero or negative price in it.
   */
  const dates: string[] = []
  const close: number[] = []
  for (const [index, date] of source.dates.entries()) {
    const value = source.values[index]
    if (value !== null && value !== undefined && value > 0) {
      dates.push(date)
      close.push(value)
    }
  }
  info(`${dates.length} trading days, ${dates[0]} to ${dates[dates.length - 1]}`)

  const macro: Record<string, (number | null)[]> = {}
  for (const [key, id] of Object.entries(MACRO_SERIES_IDS)) {
    heading(`Fetching ${id}`)
    const aligned = alignToGrid(dates, await fetchFredSeries(id))
    macro[key] = aligned
    info(`aligned to ${aligned.filter((value) => value !== null).length}/${dates.length} days`)
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(path.join(OUT_DIR, 'nasdaq.json'), JSON.stringify({ dates, close }))
  /*
   * No dates field here: every macro array aligns by index position to nasdaq.json's dates and
   * close arrays, same length and same order, so the date strings are not duplicated.
   */
  await writeFile(path.join(OUT_DIR, 'macro.json'), JSON.stringify(macro))
  pass(`Wrote baked data to ${OUT_DIR}`)
}

await main()
