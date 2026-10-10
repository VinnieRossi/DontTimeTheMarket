import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { info } from './proc'

/**
 * The external sources the stock bake reads, each behind one polite, cached client.
 *
 * Three rules hold for every call in here, and they are the reason this file exists rather than
 * the fetches being inlined where they are used:
 *
 * - Cached on disk. A bake that is interrupted and re-run reads what it already pulled instead of
 *   asking again, so iterating on the selection logic costs no further requests.
 * - Throttled per host, with a minimum gap between calls, so a full bake is a slow trickle rather
 *   than a burst. SEC publishes a fair-access limit and this stays an order of magnitude under it.
 * - Run by hand, never by CI and never at runtime. The committed output is what the game plays
 *   against; see `scripts/bake-stocks.ts` for why that matters.
 */

const CACHE_DIR = path.resolve(import.meta.dirname, '..', '..', '.cache', 'bake')

/**
 * A descriptive agent string with a contact address, which is what SEC's fair-access policy asks
 * a programmatic reader to identify itself with.
 */
const USER_AGENT = 'DTTM-data-bake contact:vinnie.rossi12@gmail.com'

const lastRequestAt = new Map<string, number>()

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`)
}

async function readCache(key: string): Promise<string | null> {
  try {
    return await readFile(cachePath(key), 'utf8')
  } catch {
    return null
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** Waits out the remainder of this host's minimum gap before letting the next call through. */
async function throttle(host: string, gapMs: number): Promise<void> {
  const previous = lastRequestAt.get(host)
  if (previous !== undefined) {
    const wait = gapMs - (Date.now() - previous)
    if (wait > 0) await sleep(wait)
  }
  lastRequestAt.set(host, Date.now())
}

export interface FetchOptions {
  /** Minimum milliseconds between two calls to the same host. */
  gapMs: number
  /** A 404 is a real answer for a missing series rather than a failure, so it caches as null. */
  treatMissingAsNull?: boolean
}

/**
 * Fetches a URL once, ever, per cache key. The body is stored verbatim so a cache hit and a live
 * call parse identically; a missing resource caches the empty string, so a known-absent series is
 * not asked for again on the next run.
 */
export async function cachedFetch(
  key: string,
  url: string,
  options: FetchOptions
): Promise<string | null> {
  const cached = await readCache(key)
  if (cached !== null) return cached === '' ? null : cached

  const host = new URL(url).host
  await throttle(host, options.gapMs)
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })

  if (!response.ok) {
    if (response.status === 404 && options.treatMissingAsNull === true) {
      await mkdir(CACHE_DIR, { recursive: true })
      await writeFile(cachePath(key), '')
      return null
    }
    throw new Error(`${url} failed: HTTP ${response.status}`)
  }

  const body = await response.text()
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(cachePath(key), body)
  return body
}

/* ---------- The company roster ---------- */

export interface Candidate {
  ticker: string
  name: string
  sector: string
  industry: string
  cik: number
}

const SP500_URL = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'

function stripMarkup(cell: string): string {
  return cell
    .replace(/^[^>]*>/, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/**
 * The company, ticker, sector, sub-industry, and CIK triples from Wikipedia's S&P 500 list. The
 * page is used only as a conveniently maintained list of real companies: the facts taken from it
 * are names, tickers, sector labels, and SEC identifiers, none of which is an original work.
 */
export async function fetchSp500Candidates(): Promise<Candidate[]> {
  const html = await cachedFetch('sp500-list', SP500_URL, { gapMs: 1000 })
  if (html === null) throw new Error('The S&P 500 list returned nothing')

  const afterAnchor = html.slice(html.indexOf('id="constituents"'))
  const table = afterAnchor.slice(0, afterAnchor.indexOf('</table>'))
  const candidates: Candidate[] = []

  for (const row of table.split('<tr').slice(2)) {
    const cells = row.split('<td').slice(1).map(stripMarkup)
    const [ticker, name, sector, industry, , , cik] = cells
    if (ticker === undefined || name === undefined || sector === undefined) continue
    if (industry === undefined || cik === undefined) continue
    if (!/^[A-Z.]{1,6}$/.test(ticker)) continue
    candidates.push({ ticker, name, sector, industry, cik: Number(cik) })
  }

  info(`${candidates.length} S&P 500 candidates`)
  return candidates
}

/* ---------- Daily prices and dividend events ---------- */

export interface StockHistory {
  /** Seconds since the epoch of the company's first ever trading day, per the price source. */
  firstTradeDate: number
  /** One entry per real trading session: the date in ISO form and the split-adjusted close. */
  days: { date: string; close: number }[]
  /** Dividend payments inside the requested window, by ex-date. */
  dividends: { date: string; amount: number }[]
}

interface YahooChartResponse {
  chart?: {
    result?: {
      meta?: { dataGranularity?: string; firstTradeDate?: number }
      timestamp?: number[]
      indicators?: { quote?: { close?: (number | null)[] }[] }
      events?: { dividends?: Record<string, { amount?: number; date?: number }> }
    }[]
  }
}

function isoDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10)
}

/**
 * Daily close prices and dividend events for one ticker, over one explicit window.
 *
 * The window is given as explicit start and end timestamps rather than as a named range, because
 * a named maximum range silently drops to quarterly granularity on this endpoint instead of
 * refusing: an explicit window of this width was checked to keep true daily resolution, and the
 * granularity the response reports is asserted below so a silent downgrade fails the bake.
 *
 * The close used is the split-adjusted close, not the dividend-adjusted one. The simulation pays
 * dividends itself from the events in the same response, so a dividend-adjusted price series
 * would pay every dividend twice.
 */
export async function fetchStockHistory(
  ticker: string,
  fromEpochSeconds: number,
  toEpochSeconds: number
): Promise<StockHistory | null> {
  // Yahoo writes a dotted class ticker with a dash, as in BRK-B for BRK.B.
  const symbol = ticker.replace('.', '-')
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
    `?period1=${fromEpochSeconds}&period2=${toEpochSeconds}&interval=1d&events=div`

  const body = await cachedFetch(`chart-${symbol}`, url, { gapMs: 900, treatMissingAsNull: true })
  if (body === null) return null

  const parsed = JSON.parse(body) as YahooChartResponse
  const result = parsed.chart?.result?.[0]
  const timestamps = result?.timestamp
  const closes = result?.indicators?.quote?.[0]?.close
  const firstTradeDate = result?.meta?.firstTradeDate
  if (timestamps === undefined || closes === undefined || firstTradeDate === undefined) return null

  const granularity = result?.meta?.dataGranularity
  if (granularity !== '1d') {
    throw new Error(`${ticker} came back at ${granularity ?? 'unknown'} granularity, not daily`)
  }

  const days: StockHistory['days'] = []
  for (const [index, timestamp] of timestamps.entries()) {
    const close = closes[index]
    if (close === null || close === undefined || close <= 0) continue
    days.push({ date: isoDate(timestamp), close })
  }

  const dividends: StockHistory['dividends'] = []
  for (const event of Object.values(result?.events?.dividends ?? {})) {
    if (event.amount === undefined || event.date === undefined || event.amount <= 0) continue
    dividends.push({ date: isoDate(event.date), amount: event.amount })
  }
  dividends.sort((left, right) => left.date.localeCompare(right.date))

  return { firstTradeDate, days, dividends }
}

/* ---------- Fundamentals ---------- */

interface FrameResponse {
  data?: { cik?: number; val?: number }[]
}

/**
 * One reported figure per company for one concept and one period, keyed by SEC CIK.
 *
 * This reads the XBRL frames endpoint, which answers with every filer's value for a single
 * concept in a single period. Asking per concept rather than per company is what keeps the whole
 * fundamentals pull to a few dozen requests instead of one multi-megabyte download per company.
 */
export async function fetchFrame(
  taxonomy: string,
  concept: string,
  unit: string,
  period: string
): Promise<Map<number, number>> {
  const url = `https://data.sec.gov/api/xbrl/frames/${taxonomy}/${concept}/${unit}/${period}.json`
  const body = await cachedFetch(`frame-${concept}-${period}`, url, {
    gapMs: 250,
    treatMissingAsNull: true,
  })
  const byCik = new Map<number, number>()
  if (body === null) return byCik

  for (const point of (JSON.parse(body) as FrameResponse).data ?? []) {
    if (point.cik === undefined || point.val === undefined) continue
    // A company can report the same concept twice in one frame through an amended filing; the
    // first entry is the one the frame presents as current, so a later repeat is ignored.
    if (!byCik.has(point.cik)) byCik.set(point.cik, point.val)
  }
  return byCik
}
