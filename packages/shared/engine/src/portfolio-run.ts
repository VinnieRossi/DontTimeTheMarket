import { disguiseRoster } from './disguise'
import { createInitialExternalNpcs, externalNpcValue } from './external-npcs'
import { DEFAULT_INDICATORS } from './indicators'
import { SERIES_LENGTH } from './market-data'
import { EMPTY_MOMENTUM } from './momentum'
import { BOGLE_NPC_ID, BOGLE_NPC_NAME } from './npc'
import type {
  Allocation,
  Holding,
  PortfolioRunState,
  StockRoster,
  UniverseAsset,
} from './portfolio-state'
import { nextInt } from './rng'
import { MAX_HOLDINGS, RUN_LENGTH_DAYS, type RunLength, STARTING_CASH } from './rules'
import { DEFAULT_SETTINGS } from './settings'

/**
 * Opening a portfolio run: draw a window of real history, disguise the roster, and put the whole
 * starting stake to work at the percentages the player chose.
 *
 * This is the one place the roster is read. From here on the run carries its own universe, which
 * is what keeps `step` able to advance a portfolio day without the baked company data anywhere in
 * its import graph, and so out of the bundle an index run loads.
 */

/** How many trading days of run-up the window leaves before a run may start. */
const START_MARGIN_DAYS = 30

/**
 * The earliest day a portfolio run may start: far enough into the companies' history that the
 * window-based indicators have something to read on day one.
 */
export function minStartDay(roster: StockRoster): number {
  return roster.historyStartDay + START_MARGIN_DAYS
}

/**
 * The latest day a portfolio run of a given length may start, which is simply the last day the
 * chosen length still fits before the data runs out.
 *
 * Index mode reserves twice the run length so a Continue always has somewhere to go. A portfolio
 * run does not, and the trade is deliberate: the companies' history is shallower than the index's,
 * so reserving a second horizon would shrink the set of windows a run could be drawn from to
 * almost nothing. A portfolio run that ends against the end of the data is simply told it has no
 * history left to continue into.
 */
export function maxStartDay(runLength: RunLength): number {
  return SERIES_LENGTH - RUN_LENGTH_DAYS[runLength] - 2
}

/** Drops unknown companies, ignores anything past the holding limit, and rescales to 100. */
function cleanAllocations(allocations: readonly Allocation[], roster: StockRoster): Allocation[] {
  const known = new Set(roster.companies.map((company) => company.id))
  const seen = new Set<string>()
  const kept: Allocation[] = []
  for (const allocation of allocations) {
    if (!known.has(allocation.assetId) || seen.has(allocation.assetId)) continue
    if (allocation.percent <= 0 || kept.length >= MAX_HOLDINGS) continue
    seen.add(allocation.assetId)
    kept.push(allocation)
  }
  const total = kept.reduce((sum, allocation) => sum + allocation.percent, 0)
  if (total <= 0) return []
  return kept.map((allocation) => ({
    assetId: allocation.assetId,
    percent: (allocation.percent / total) * 100,
  }))
}

/** Turns the committed file's flat number lists into the [day, amount] pairs a run reads. */
function toDividendEvents(
  raw: readonly (readonly number[])[]
): readonly (readonly [number, number])[] {
  const events: (readonly [number, number])[] = []
  for (const entry of raw) {
    const [day, amount] = entry
    if (day === undefined || amount === undefined) continue
    events.push([day, amount])
  }
  return events
}

/** The disguised roster paired with each company's real history, positioned on the day grid. */
export function buildUniverse(seed: number, roster: StockRoster): UniverseAsset[] {
  const disguised = disguiseRoster(seed, roster.companies)
  const universe: UniverseAsset[] = []
  for (const [index, company] of roster.companies.entries()) {
    const identity = disguised[index]
    if (identity === undefined) continue
    universe.push({
      company: identity,
      series: {
        firstDay: roster.historyStartDay,
        close: company.close,
        dividends: toDividendEvents(company.dividends),
      },
    })
  }
  return universe
}

/**
 * Opens a portfolio run at a seeded random point in the companies' shared history.
 *
 * The whole starting stake goes in on the first day, at the chosen percentages, and the benchmark
 * buys the identical basket on the identical day. Neither pays a spread on that first allocation:
 * it is the run's starting position rather than a trade either of them chose to make, and charging
 * only the player for a decision the game required of them would be a handicap nobody asked for.
 * Every trade after this one costs both of them exactly what index mode charges.
 */
export function startPortfolioRun(
  seed: number,
  runLength: RunLength,
  allocations: readonly Allocation[],
  roster: StockRoster
): PortfolioRunState {
  const universe = buildUniverse(seed, roster)
  const floor = minStartDay(roster)
  const ceiling = Math.max(maxStartDay(runLength), floor + 1)
  const draw = nextInt(seed, ceiling - floor)
  const startDay = floor + draw.value

  const externalNpcs = createInitialExternalNpcs(startDay)

  const chosen = cleanAllocations(allocations, roster)
  const holdings: Holding[] = []
  const npcShares: Record<string, number> = {}
  let invested = 0

  for (const allocation of chosen) {
    const asset = universe.find((candidate) => candidate.company.id === allocation.assetId)
    const price = asset?.series.close[startDay - asset.series.firstDay]
    if (asset === undefined || price === undefined || price <= 0) continue
    const stake = STARTING_CASH * (allocation.percent / 100)
    const shares = stake / price
    holdings.push({
      assetId: allocation.assetId,
      targetPct: allocation.percent,
      shares,
      lots: [{ qty: shares, cost: price, day: startDay }],
    })
    npcShares[allocation.assetId] = shares
    invested += stake
  }

  return {
    mode: 'portfolio',
    phase: 'running',
    seed,
    rngState: draw.state,
    runLength,
    horizonDays: RUN_LENGTH_DAYS[runLength],
    startDay,
    day: startDay,
    cash: STARTING_CASH - invested,
    holdings,
    pending: [],
    nextOrderId: 1,
    npcs: [
      {
        id: BOGLE_NPC_ID,
        name: BOGLE_NPC_NAME,
        cash: STARTING_CASH - invested,
        shares: npcShares,
      },
    ],
    externalNpcs,
    settings: DEFAULT_SETTINGS,
    indicators: DEFAULT_INDICATORS,
    momentum: EMPTY_MOMENTUM,
    tradeLog: [],
    valueHistory: [
      {
        day: startDay,
        playerValue: STARTING_CASH,
        npcValues: {
          [BOGLE_NPC_ID]: STARTING_CASH,
          ...Object.fromEntries(
            externalNpcs.map((npc) => [npc.id, externalNpcValue(npc, startDay)])
          ),
        },
      },
    ],
    tradeCount: 0,
    taxPaid: 0,
    feesPaid: 0,
    peakValue: STARTING_CASH,
    maxDrawdownPct: 0,
    lastCommentDay: 0,
    commentaryKey: null,
    speed: '1x',
    universe,
  }
}
