import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import nasdaq from '../packages/shared/engine/data/baked/nasdaq.json' with { type: 'json' }
import {
  type Candidate,
  fetchFrame,
  fetchSp500Candidates,
  fetchStockHistory,
  type StockHistory,
} from './lib/bake-sources'
import { heading, info, pass } from './lib/proc'

/**
 * The company bake. Run it by hand with `pnpm bake-stocks`.
 *
 * It writes the roster that portfolio runs are played against: real daily close prices, real
 * dividend events, real sector and industry labels, and real fundamentals, for a sector-balanced
 * selection of large American companies. Nothing in CI or at runtime invokes it, and the deployed
 * app never contacts any of these sources: a run plays against the committed output, which is
 * what makes a seed reproducible from the repository alone years later.
 *
 * Re-run it when the data should be refreshed, for example quarterly. Every request it makes is
 * cached on disk under `.cache/bake`, so a re-run after an interruption resumes rather than
 * re-fetching, and iterating on the selection below costs no further requests at all.
 *
 * One honest limitation, stated in the product too: every free source of per-company daily
 * history serves only companies that are still listed, so this roster is a survivors-only sample.
 * Companies that went to zero are absent, which makes picking stocks look easier here than it is.
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

/**
 * The first calendar day of history a portfolio run can be played over.
 *
 * It is far later than the index series starts, and the reason is the roster rather than the
 * data: requiring every company to have been listed since 1971 would cut the roster to a handful
 * of survivors in three sectors. Starting in 2005 admits a broad, sector-balanced set of real
 * companies while still covering 2008, which is the most instructive stretch of market history
 * available at any depth.
 */
const HISTORY_START_DATE = '2005-01-03'

/** How many companies are taken from each GICS sector. */
const SECTOR_QUOTA = 6

/**
 * How many candidates may be probed per sector before its quota is abandoned. It bounds the
 * number of price requests a bake makes: without it, a sector whose companies mostly listed after
 * 2005 would walk the whole list.
 */
const PROBE_LIMIT = 30

/** Fiscal years the fundamentals trends cover. */
const FUNDAMENTAL_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024] as const

/** Revenue is reported under several concepts, so they are tried in this order per company. */
const REVENUE_CONCEPTS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
  'RevenueFromContractWithCustomerIncludingAssessedTax',
] as const

/** Owners' equity, likewise reported under either tag depending on the filer. */
const EQUITY_CONCEPTS = [
  'StockholdersEquity',
  'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest',
] as const

/** Quarters the share count is read from, most recent first, to size a company's market cap. */
const SHARE_COUNT_PERIODS = ['CY2025Q2I', 'CY2025Q1I', 'CY2024Q4I'] as const

const MEGA_CAP_USD = 200e9
const LARGE_CAP_USD = 10e9

const TRADING_DAYS_PER_YEAR = 252

/** How stale a company's last print may be before it is treated as no longer listed. */
const MAX_STALE_DAYS = 10

export type CapTier = 'mid' | 'large' | 'mega'

interface FundamentalTrends {
  /** The fiscal years each trend below has a value for, ascending. */
  years: number[]
  /** Revenue as an index with the first year set to 100: a shape, not a dollar figure. */
  revenueIndex: number[]
  netMarginPct: number[]
  debtToEquity: number[]
}

interface BakedCompany {
  id: string
  name: string
  sector: string
  industry: string
  capTier: CapTier
  dividendYieldPct: number
  volatilityPct: number
  close: number[]
  dividends: [number, number][]
  fundamentals: FundamentalTrends | null
}

const dates: readonly string[] = nasdaq.dates
const historyStartDay = dates.findIndex((date) => date >= HISTORY_START_DATE)
const gridDates = dates.slice(historyStartDay)

/** Five significant digits. The game rebases every price to 100 at a run's start, so what has to
 * survive rounding is the shape of the move rather than the cent. */
function compact(value: number): number {
  return Number(value.toPrecision(5))
}

/**
 * Lays a company's real trading sessions onto the index's trading-day grid by carrying the last
 * known close forward, which is how a company that did not print on a day the grid has (a
 * different exchange holiday, a trading halt) keeps a price without inventing one. It never
 * reaches forward, so no day can see a price from its own future.
 *
 * Returns null when the company has no print at or before the grid's first day, because that is a
 * company whose history does not cover the window rather than one with a gap in it.
 */
function alignToGrid(history: StockHistory): number[] | null {
  const byDate = new Map(history.days.map((day) => [day.date, day.close]))
  const sorted = history.days.map((day) => day.date)
  const aligned: number[] = []
  let lastKnown: number | null = null
  let cursor = 0

  for (const date of gridDates) {
    while (cursor < sorted.length) {
      const sourceDate = sorted[cursor]
      if (sourceDate === undefined || sourceDate > date) break
      lastKnown = byDate.get(sourceDate) ?? lastKnown
      cursor += 1
    }
    if (lastKnown === null) return null
    aligned.push(lastKnown)
  }
  return aligned
}

/**
 * Dividend ex-dates placed on the first grid day at or after each one, as offsets into the window.
 *
 * The price request deliberately reaches back before the window opens so a company's price on the
 * window's first day is a real print rather than a carried-forward guess, which means it also
 * returns dividends paid before the window. Those are dropped rather than clamped to the first
 * day: a run cannot pay a dividend whose ex-date it never reached.
 */
function alignDividends(history: StockHistory): [number, number][] {
  const windowStart = gridDates[0] ?? ''
  const events: [number, number][] = []
  let cursor = 0
  for (const dividend of history.dividends) {
    if (dividend.date < windowStart) continue
    while (cursor < gridDates.length && (gridDates[cursor] ?? '') < dividend.date) cursor += 1
    if (cursor >= gridDates.length) break
    events.push([cursor, compact(dividend.amount)])
  }
  return events
}

function trailingDividendYieldPct(close: number[], dividends: [number, number][]): number {
  const lastPrice = close[close.length - 1] ?? 0
  if (lastPrice <= 0) return 0
  const from = close.length - TRADING_DAYS_PER_YEAR
  const paid = dividends.filter(([day]) => day >= from).reduce((sum, [, amount]) => sum + amount, 0)
  return compact((paid / lastPrice) * 100)
}

/** Annualized standard deviation of daily log returns, in percent. */
function volatilityPct(close: number[]): number {
  const returns: number[] = []
  for (let index = 1; index < close.length; index++) {
    const previous = close[index - 1]
    const current = close[index]
    if (previous === undefined || current === undefined || previous <= 0) continue
    returns.push(Math.log(current / previous))
  }
  if (returns.length < 2) return 0
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1)
  return compact(Math.sqrt(variance * TRADING_DAYS_PER_YEAR) * 100)
}

interface Frames {
  revenue: Map<number, number>[]
  netIncome: Map<number, number>[]
  liabilities: Map<number, number>[]
  equity: Map<number, number>[]
  shares: Map<number, number>
}

/** The first concept in the list that a company reported, which is how one figure is read from
 * several tags that mean the same thing. */
async function mergedFrame(
  concepts: readonly string[],
  unit: string,
  period: string
): Promise<Map<number, number>> {
  const merged = new Map<number, number>()
  for (const concept of concepts) {
    for (const [cik, value] of await fetchFrame('us-gaap', concept, unit, period)) {
      if (!merged.has(cik)) merged.set(cik, value)
    }
  }
  return merged
}

async function loadFrames(): Promise<Frames> {
  heading('Fetching SEC XBRL frames')
  const revenue: Map<number, number>[] = []
  const netIncome: Map<number, number>[] = []
  const liabilities: Map<number, number>[] = []
  const equity: Map<number, number>[] = []

  for (const year of FUNDAMENTAL_YEARS) {
    revenue.push(await mergedFrame(REVENUE_CONCEPTS, 'USD', `CY${year}`))
    netIncome.push(await mergedFrame(['NetIncomeLoss'], 'USD', `CY${year}`))
    const book = await mergedFrame(EQUITY_CONCEPTS, 'USD', `CY${year}Q4I`)
    equity.push(book)

    /*
     * Plenty of filers never tag total liabilities on its own, but every balance sheet tags the
     * total of liabilities and equity, so the difference recovers the figure exactly rather than
     * leaving the company without a debt trend.
     */
    const direct = await mergedFrame(['Liabilities'], 'USD', `CY${year}Q4I`)
    const total = await mergedFrame(['LiabilitiesAndStockholdersEquity'], 'USD', `CY${year}Q4I`)
    const derived = new Map(direct)
    for (const [cik, combined] of total) {
      const ownersEquity = book.get(cik)
      if (derived.has(cik) || ownersEquity === undefined) continue
      derived.set(cik, combined - ownersEquity)
    }
    liabilities.push(derived)

    info(`CY${year}: ${revenue[revenue.length - 1]?.size ?? 0} companies reported revenue`)
  }

  const shares = new Map<number, number>()
  for (const period of SHARE_COUNT_PERIODS) {
    const frame = await fetchFrame('dei', 'EntityCommonStockSharesOutstanding', 'shares', period)
    for (const [cik, value] of frame) if (!shares.has(cik)) shares.set(cik, value)
  }
  info(`${shares.size} companies have a recent share count`)

  return { revenue, netIncome, liabilities, equity, shares }
}

function trendsFor(cik: number, frames: Frames): FundamentalTrends | null {
  const years: number[] = []
  const revenues: number[] = []
  const netMarginPct: number[] = []
  const debtToEquity: number[] = []

  for (const [index, year] of FUNDAMENTAL_YEARS.entries()) {
    const revenue = frames.revenue[index]?.get(cik)
    const income = frames.netIncome[index]?.get(cik)
    const debt = frames.liabilities[index]?.get(cik)
    const book = frames.equity[index]?.get(cik)
    if (revenue === undefined || revenue <= 0 || income === undefined) continue
    if (debt === undefined || book === undefined || book <= 0) continue
    years.push(year)
    revenues.push(revenue)
    netMarginPct.push(compact((income / revenue) * 100))
    debtToEquity.push(compact(debt / book))
  }

  if (years.length < 3) return null
  const base = revenues[0] ?? 1
  return {
    years,
    revenueIndex: revenues.map((value) => compact((value / base) * 100)),
    netMarginPct,
    debtToEquity,
  }
}

function capTier(cik: number, lastPrice: number, frames: Frames): CapTier {
  const shares = frames.shares.get(cik)
  if (shares === undefined) return 'large'
  const marketCap = shares * lastPrice
  if (marketCap >= MEGA_CAP_USD) return 'mega'
  if (marketCap >= LARGE_CAP_USD) return 'large'
  return 'mid'
}

/**
 * Whether a company's history covers the whole window. A company listed after the window opens
 * cannot be offered, because a run drawn anywhere in the window would have no price for it; a
 * company whose prints stop early is one the source no longer carries.
 */
function covers(history: StockHistory): boolean {
  const firstTrade = new Date(history.firstTradeDate * 1000).toISOString().slice(0, 10)
  if (firstTrade > HISTORY_START_DATE) return false
  const lastPrint = history.days[history.days.length - 1]?.date
  const gridEnd = gridDates[gridDates.length - 1]
  if (lastPrint === undefined || gridEnd === undefined) return false
  const staleDays = (Date.parse(gridEnd) - Date.parse(lastPrint)) / 86_400_000
  return staleDays <= MAX_STALE_DAYS
}

function toCompany(
  candidate: Candidate,
  history: StockHistory,
  frames: Frames
): BakedCompany | null {
  const aligned = alignToGrid(history)
  if (aligned === null) return null
  const dividends = alignDividends(history)
  const lastPrice = aligned[aligned.length - 1] ?? 0

  return {
    id: candidate.ticker,
    name: candidate.name,
    sector: candidate.sector,
    industry: candidate.industry,
    capTier: capTier(candidate.cik, lastPrice, frames),
    dividendYieldPct: trailingDividendYieldPct(aligned, dividends),
    volatilityPct: volatilityPct(aligned),
    close: aligned.map(compact),
    dividends,
    fundamentals: trendsFor(candidate.cik, frames),
  }
}

/**
 * Ranks a sector's candidates by reported revenue, descending, so the companies probed first are
 * the ones whose price behavior a player has the best chance of reasoning about. A company with
 * no reported revenue sorts last rather than being dropped, since the roster only needs a label
 * and a price series to be playable.
 */
function rankBySize(candidates: Candidate[], frames: Frames): Candidate[] {
  const latest = frames.revenue[frames.revenue.length - 1] ?? new Map<number, number>()
  return [...candidates].sort(
    (left, right) => (latest.get(right.cik) ?? 0) - (latest.get(left.cik) ?? 0)
  )
}

/** Splits a ranked list into `count` contiguous bands of near-equal length. */
function intoBands<T>(ranked: readonly T[], count: number): T[][] {
  const bands: T[][] = []
  for (let index = 0; index < count; index++) {
    const from = Math.floor((index * ranked.length) / count)
    const to = Math.floor(((index + 1) * ranked.length) / count)
    bands.push(ranked.slice(from, to))
  }
  return bands
}

/**
 * Picks one sector's companies: one from each size band, preferring an industry the sector has not
 * used yet.
 *
 * Both preferences exist for the same reason. Six companies drawn from one industry would move as
 * one line, and six drawn from the very top of the size ranking would all be the same kind of
 * mega-cap, so a portfolio built from either would teach a player nothing about diversifying.
 * Banding the ranking by reported revenue and taking one company from each band is what puts a
 * genuine spread of company sizes on the roster.
 */
/**
 * One sector's running tally while it is being filled: what has been taken, which industries are
 * already represented, who was passed over, and how many price requests have been spent.
 */
interface SectorPick {
  picked: BakedCompany[]
  usedIndustries: Set<string>
  skipped: Candidate[]
  probes: number
}

/** Probes one candidate, taking it if its history covers the whole window. */
async function consider(
  tally: SectorPick,
  candidate: Candidate,
  frames: Frames,
  window: { from: number; to: number }
): Promise<boolean> {
  tally.probes += 1
  const history = await fetchStockHistory(candidate.ticker, window.from, window.to)
  if (history === null || !covers(history)) return false
  const company = toCompany(candidate, history, frames)
  if (company === null) return false
  tally.picked.push(company)
  tally.usedIndustries.add(candidate.industry)
  return true
}

/** Takes the first candidate in one band that passes, trying unused industries before repeats. */
async function fillBand(
  tally: SectorPick,
  band: readonly Candidate[],
  frames: Frames,
  window: { from: number; to: number }
): Promise<void> {
  const fresh = band.filter((candidate) => !tally.usedIndustries.has(candidate.industry))
  const repeats = band.filter((candidate) => tally.usedIndustries.has(candidate.industry))
  for (const candidate of [...fresh, ...repeats]) {
    if (tally.probes >= PROBE_LIMIT) return
    if (await consider(tally, candidate, frames, window)) return
    tally.skipped.push(candidate)
  }
}

async function pickSector(
  sector: string,
  candidates: Candidate[],
  frames: Frames,
  window: { from: number; to: number }
): Promise<BakedCompany[]> {
  const tally: SectorPick = {
    picked: [],
    usedIndustries: new Set<string>(),
    skipped: [],
    probes: 0,
  }

  for (const band of intoBands(rankBySize(candidates, frames), SECTOR_QUOTA)) {
    if (tally.probes >= PROBE_LIMIT) break
    await fillBand(tally, band, frames, window)
  }

  // A band whose companies all listed after the window opens leaves the sector short, so whatever
  // was passed over while filling the other bands gets a second look.
  for (const candidate of tally.skipped) {
    if (tally.picked.length >= SECTOR_QUOTA || tally.probes >= PROBE_LIMIT) break
    await consider(tally, candidate, frames, window)
  }

  const { picked, probes } = tally
  info(`${sector}: ${picked.length} of ${SECTOR_QUOTA} after ${probes} probes`)
  return picked
}

async function main(): Promise<void> {
  heading(`Baking companies over ${gridDates.length} trading days from ${HISTORY_START_DATE}`)
  if (historyStartDay < 0) throw new Error(`No index trading day on or after ${HISTORY_START_DATE}`)

  const candidates = await fetchSp500Candidates()
  const frames = await loadFrames()

  const window = {
    from: Math.floor(Date.parse(HISTORY_START_DATE) / 1000) - 86_400 * 400,
    to: Math.floor(Date.parse(`${gridDates[gridDates.length - 1]}T23:59:59Z`) / 1000),
  }

  const bySector = new Map<string, Candidate[]>()
  for (const candidate of candidates) {
    const list = bySector.get(candidate.sector) ?? []
    list.push(candidate)
    bySector.set(candidate.sector, list)
  }

  heading(`Fetching prices for ${bySector.size} sectors`)
  const companies: BakedCompany[] = []
  for (const sector of [...bySector.keys()].sort()) {
    companies.push(...(await pickSector(sector, bySector.get(sector) ?? [], frames, window)))
  }
  companies.sort((left, right) => left.id.localeCompare(right.id))

  const payload = JSON.stringify({ historyStartDay, companies })
  await writeFile(path.join(OUT_DIR, 'stocks.json'), payload)

  const withTrends = companies.filter((company) => company.fundamentals !== null).length
  info(`${companies.length} companies, ${withTrends} with fundamentals trends`)
  info(`${(payload.length / 1024 / 1024).toFixed(2)} MB raw`)
  info(`${(gzipSync(payload).length / 1024).toFixed(0)} KB gzipped`)
  pass(`Wrote the company roster to ${OUT_DIR}`)
}

await main()
