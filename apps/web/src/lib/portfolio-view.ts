import {
  type Allocation,
  allocationTotal,
  analystNote,
  assetIn,
  BOGLE_NPC_ID,
  buildPortfolioChartData,
  type CapTier,
  type ChartPoint,
  type DisguisedCompany,
  EXTERNAL_NPC_DEFINITIONS,
  type FundamentalTrends,
  holdingSparkline,
  holdingValue,
  isAllocationComplete,
  MAX_HOLDINGS,
  MIN_SCORING_DAYS,
  type PortfolioRunState,
  portfolioCanCashOut,
  portfolioEdgeBpsVs,
  portfolioElapsedDays,
  portfolioHasRoomToContinue,
  portfolioIndicatorChips,
  portfolioNpcValue,
  portfolioRunningGapPctVs,
  portfolioTotalReturnPct,
  portfolioValue,
  REBALANCE_DRIFT_PCT,
  TOTAL_PCT,
  weightPctOf,
} from '@dttm/engine'
import type {
  ActionView,
  AllocationRowView,
  ChartLegendItem,
  ChartMarkerView,
  ChartSeriesView,
  ChoiceView,
  CompanyCardView,
  CompanyDetailView,
  FigureView,
  HallOfFameView,
  HoldingRowView,
  PendingOrderView,
  ReadoutItem,
  RevealRowView,
  TrendView,
} from '@dttm/ui'
import {
  formatMoney,
  formatPercent,
  formatSignedPercent,
  formatSignedPoints,
  formatWholePercent,
} from '@dttm/utils'
import { BENCHMARK_NAME, endScreenCopy } from './game-view'

/**
 * The mapping from a portfolio run to what the screens render. Every figure is formatted here and
 * every state decided here, so the components stay renderable from a story and the engine stays
 * free of copy.
 *
 * It holds one thing the index mapping does not have to think about: nothing in here may put a
 * real company name on screen while a run is going. The disguised name and ticker are what the
 * screens are handed, and the real name appears in exactly one function, the one that builds the
 * reveal for the end of the run.
 */

/** The grouping a roster can be narrowed by, when the player has not narrowed it. */
export const ALL_SECTORS = 'all'

const CAP_TIER_LABELS: Record<CapTier, string> = {
  mid: 'Mid cap',
  large: 'Large cap',
  mega: 'Mega cap',
}

export const BUILDER_COPY = {
  heading: 'Build your portfolio',
  lede: `Real company histories under generated names. The sector, the industry, the size, the yield and the filings are all true; only the name and the ticker are made up, so you are judging the company rather than the logo. Pick up to ${MAX_HOLDINGS}, split the money between them, and the ${BENCHMARK_NAME} buys the same basket and then never touches it again.`,
  emptyNote: 'No companies in that sector.',
  allocationPrompt: 'Tap a company above and it appears here with a share of the money.',
  survivorshipNote:
    'Survivorship bias, disclosed: every free source of daily company history serves only companies that are still listed, so this roster cannot include the ones that went to zero. That makes picking stocks look easier here than it is in real life, where nobody gets to choose only from the survivors.',
  hallOfFameHeading: 'Hall of Fame (not tradeable)',
  hallOfFameNote:
    'The collapses no free data source will serve, kept here as history rather than as a trade. There is no price line behind these, and the game will not pretend there is.',
  pickerLede: 'Any company on the roster, held or not. It fills at the next day’s price.',
} as const

/**
 * Three famous wipeouts, under their real names, with no chart and nothing to trade.
 *
 * They are named rather than disguised because they are not part of the roster: no free source
 * carries their price history, so rather than invent a series for a real, named company, the game
 * tells the story and leaves the trading out of it.
 */
export const HALL_OF_FAME: readonly HallOfFameView[] = [
  {
    name: 'Enron',
    note: 'An accounting fraud that hid billions in debt off the balance sheet. It filed for bankruptcy in December 2001 and the shares went to nothing.',
  },
  {
    name: 'Lehman Brothers',
    note: 'A 158-year-old investment bank that filed the largest bankruptcy in US history in September 2008, after its mortgage positions turned out to be unhedgeable.',
  },
  {
    name: 'Washington Mutual',
    note: 'The largest savings and loan in the country until regulators seized it in September 2008 and sold the banking operations overnight. The holding company shares were wiped out.',
  },
]

/** The sector filters, in the order a player reads them, with "every sector" first. */
export function sectorGroups(companies: readonly DisguisedCompany[]): readonly ChoiceView[] {
  const sectors = [...new Set(companies.map((company) => company.sector))].sort()
  return [
    { value: ALL_SECTORS, label: 'All sectors' },
    ...sectors.map((sector) => ({ value: sector, label: sector })),
  ]
}

function tagsFor(company: DisguisedCompany): readonly string[] {
  return [
    CAP_TIER_LABELS[company.capTier],
    company.dividendYieldPct > 0
      ? `${formatPercent(company.dividendYieldPct)} yield`
      : 'No dividend',
    `${formatPercent(company.volatilityPct)} volatility`,
  ]
}

export function companyCards(
  companies: readonly DisguisedCompany[],
  allocations: readonly Allocation[],
  group: string
): readonly CompanyCardView[] {
  const picked = new Set(allocations.map((allocation) => allocation.assetId))
  return companies
    .filter((company) => group === ALL_SECTORS || company.sector === group)
    .map((company) => ({
      assetId: company.id,
      ticker: company.fakeTicker,
      name: company.fakeName,
      sector: company.sector,
      industry: company.industry,
      tags: tagsFor(company),
      selected: picked.has(company.id),
    }))
}

export function allocationRows(
  allocations: readonly Allocation[],
  companies: readonly DisguisedCompany[]
): readonly AllocationRowView[] {
  return allocations.map((allocation) => {
    const company = companies.find((candidate) => candidate.id === allocation.assetId)
    return {
      assetId: allocation.assetId,
      ticker: company?.fakeTicker ?? allocation.assetId,
      name: company?.fakeName ?? allocation.assetId,
      percent: formatWholePercent(allocation.percent),
      canIncrease: allocations.length > 1 && allocation.percent < TOTAL_PCT,
      canDecrease: allocations.length > 1 && allocation.percent > 0,
    }
  })
}

export function allocationTotalLabel(allocations: readonly Allocation[]): string {
  const total = allocationTotal(allocations)
  if (total === TOTAL_PCT) return `Total: ${total}% of your money, all placed`
  const left = TOTAL_PCT - total
  return `Total: ${total}% - ${Math.abs(left)}% ${left > 0 ? 'still to place' : 'over'}`
}

export function startAction(allocations: readonly Allocation[]): ActionView {
  if (allocations.length === 0) return { label: 'Pick at least one company', enabled: false }
  if (!isAllocationComplete(allocations)) {
    return { label: 'The split has to total 100%', enabled: false }
  }
  return { label: 'Start run with this portfolio', enabled: true }
}

/** Whether tapping another company would do anything, so the screen can say when it would not. */
export function canPickMore(allocations: readonly Allocation[]): boolean {
  return allocations.length < MAX_HOLDINGS
}

function trendCaption(points: readonly number[], rising: string, falling: string): string {
  const first = points[0] ?? 0
  const last = points[points.length - 1] ?? 0
  if (first === 0) return 'Flat'
  const change = (last - first) / Math.abs(first)
  if (Math.abs(change) < 0.05) return 'Flat'
  return change > 0 ? rising : falling
}

function asPoints(values: readonly number[]): readonly ChartPoint[] {
  return values.map((value, index) => ({ day: index, value }))
}

function trendsFor(fundamentals: FundamentalTrends | null): readonly TrendView[] {
  if (fundamentals === null) return []
  return [
    {
      label: 'Revenue',
      points: asPoints(fundamentals.revenueIndex),
      caption: trendCaption(fundamentals.revenueIndex, 'Growing', 'Shrinking'),
    },
    {
      label: 'Net margin',
      points: asPoints(fundamentals.netMarginPct),
      caption: trendCaption(fundamentals.netMarginPct, 'Widening', 'Narrowing'),
    },
    {
      label: 'Debt to equity',
      points: asPoints(fundamentals.debtToEquity),
      caption: trendCaption(fundamentals.debtToEquity, 'Rising', 'Falling'),
    },
  ]
}

export function companyDetail(company: DisguisedCompany): CompanyDetailView {
  const years = company.fundamentals?.years ?? []
  return {
    assetId: company.id,
    ticker: company.fakeTicker,
    name: company.fakeName,
    sector: company.sector,
    industry: company.industry,
    stats: [
      { label: 'Size', value: CAP_TIER_LABELS[company.capTier] },
      {
        label: 'Dividend yield',
        value: company.dividendYieldPct > 0 ? formatPercent(company.dividendYieldPct) : 'None',
      },
      { label: 'Volatility', value: `${formatPercent(company.volatilityPct)} a year` },
      {
        label: 'Filings read',
        value: years.length === 0 ? 'None available' : `${years.length} fiscal years`,
      },
    ],
    trends: trendsFor(company.fundamentals),
    note: analystNote(company.analystNoteKey),
  }
}

export function detailAction(held: boolean): ActionView {
  return held
    ? { label: 'Already in your portfolio', enabled: false }
    : { label: 'Add to portfolio', enabled: true }
}

/* ---------- The running portfolio ---------- */

export function portfolioDayLabel(state: PortfolioRunState): string {
  return `Day ${portfolioElapsedDays(state) + 1} / ${state.horizonDays}`
}

export function portfolioChartView(state: PortfolioRunState): {
  series: readonly ChartSeriesView[]
  markers: readonly ChartMarkerView[]
} {
  return buildPortfolioChartData(state, BOGLE_NPC_ID)
}

export function portfolioLegend(state: PortfolioRunState): readonly ChartLegendItem[] {
  const items: ChartLegendItem[] = [
    { role: 'player', label: 'Your portfolio' },
    { role: 'benchmark', label: BENCHMARK_NAME },
  ]
  if (state.indicators.sma) {
    items.push({ role: 'sma20', label: 'SMA 20' }, { role: 'sma50', label: 'SMA 50' })
  }
  if (state.indicators.bb) items.push({ role: 'bollingerUpper', label: 'Bollinger Bands' })
  return items
}

export function portfolioReadouts(state: PortfolioRunState): readonly ReadoutItem[] {
  return portfolioIndicatorChips(state)
}

export function portfolioPlayerFigure(state: PortfolioRunState): FigureView {
  return { label: 'You', value: formatMoney(portfolioValue(state)) }
}

export function portfolioBenchmarkFigure(state: PortfolioRunState): FigureView {
  return { label: BENCHMARK_NAME, value: formatMoney(portfolioNpcValue(state, BOGLE_NPC_ID)) }
}

/**
 * One figure per external benchmark NPC actually present in this run. A portfolio run always
 * starts well after all three series exist, so in practice this is never empty, but it is read
 * from the run rather than assumed, the same way the index-mode equivalent is.
 */
export function portfolioExternalNpcFigures(state: PortfolioRunState): FigureView[] {
  const present = new Set(state.externalNpcs.map((npc) => npc.id))
  return EXTERNAL_NPC_DEFINITIONS.filter((definition) => present.has(definition.id)).map(
    (definition) => ({
      label: definition.name,
      value: formatMoney(portfolioNpcValue(state, definition.id)),
      note: definition.note,
    })
  )
}

export function portfolioTiles(state: PortfolioRunState): readonly FigureView[] {
  const gap = portfolioRunningGapPctVs(state, BOGLE_NPC_ID)
  const count = state.holdings.length
  return [
    { label: 'Cash', value: formatMoney(state.cash) },
    { label: 'Holdings', value: count === 1 ? '1 company' : `${count} companies` },
    {
      label: `Vs ${BENCHMARK_NAME}`,
      value: formatSignedPercent(gap),
      direction: gap >= 0 ? 'up' : 'down',
    },
    ...portfolioExternalNpcFigures(state),
  ]
}

export function portfolioCashOutAction(state: PortfolioRunState): ActionView {
  return portfolioCanCashOut(state)
    ? { label: 'Cash out now', enabled: true }
    : { label: `Cash out (unlocks day ${MIN_SCORING_DAYS})`, enabled: false }
}

/**
 * The rebalance action. It is off when there is nothing to put back, which is both honest and the
 * only way a player can tell the difference between a portfolio at its targets and a button that
 * did nothing.
 */
export function rebalanceAction(state: PortfolioRunState): ActionView {
  const drifted = state.holdings.some(
    (holding) => Math.abs(weightPctOf(state, holding) - holding.targetPct) >= REBALANCE_DRIFT_PCT
  )
  return drifted
    ? { label: 'Rebalance', enabled: true }
    : { label: 'Nothing to rebalance', enabled: false }
}

export function holdingRows(state: PortfolioRunState): readonly HoldingRowView[] {
  return state.holdings.map((holding) => {
    const asset = assetIn(state.universe, holding.assetId)
    const weight = weightPctOf(state, holding)
    const drift = weight - holding.targetPct
    return {
      assetId: holding.assetId,
      ticker: asset?.company.fakeTicker ?? holding.assetId,
      name: asset?.company.fakeName ?? holding.assetId,
      detail: `${asset?.company.sector ?? ''} - ${asset?.company.industry ?? ''}`,
      value: formatMoney(holdingValue(state, holding)),
      weight: `${formatWholePercent(weight)} now, ${formatWholePercent(holding.targetPct)} target`,
      drift: formatSignedPoints(drift),
      direction: drift >= 0 ? 'up' : 'down',
      spark:
        asset === undefined
          ? []
          : holdingSparkline(state, asset.series.close, asset.series.firstDay),
    }
  })
}

export const HOLDINGS_EMPTY_NOTE =
  'Every position is sold. You are entirely in cash, earning the T-bill rate and nothing else.'

export function tradeSubject(state: PortfolioRunState, assetId: string): string {
  return assetIn(state.universe, assetId)?.company.fakeTicker ?? assetId
}

/**
 * The orders waiting for tomorrow's prices, named by the company each one is for.
 *
 * Every order in a portfolio run is on one company, so the ticker is the whole description. They
 * are shown rather than kept quiet because a rebalance queues several at once and a player who
 * changed their mind has to be able to take them back.
 */
export function portfolioPendingOrders(state: PortfolioRunState): readonly PendingOrderView[] {
  return state.pending.map((order) => ({
    id: order.id,
    description: `${order.side} ${tradeSubject(state, order.assetId ?? '')}, fills tomorrow`,
  }))
}

/* ---------- The end of a portfolio run ---------- */

/**
 * Who the companies actually were. This is the one function in the mapping that reads a real name,
 * and it is only ever called once a run has ended.
 */
export function revealRows(state: PortfolioRunState): readonly RevealRowView[] {
  const held = new Set(state.holdings.map((holding) => holding.assetId))
  for (const trade of state.tradeLog) {
    if (trade.assetId !== undefined) held.add(trade.assetId)
  }
  return state.universe
    .filter((asset) => held.has(asset.company.id))
    .map((asset) => ({
      assetId: asset.company.id,
      ticker: asset.company.fakeTicker,
      fakeName: asset.company.fakeName,
      realName: asset.company.realName,
      detail: `${asset.company.sector} - ${asset.company.industry}`,
    }))
}

export const REVEAL_NOTE =
  'Generated names, real companies and real price history. You were reading the sector, the filings and the shape of the line, which is the only honest way to pick a stock you have never heard of.'

export function portfolioEndScreenView(state: PortfolioRunState) {
  const edge = portfolioEdgeBpsVs(state, BOGLE_NPC_ID)
  const won = edge >= 0
  const view = endScreenCopy({
    edge,
    totalReturnPct: portfolioTotalReturnPct(state),
    maxDrawdownPct: state.maxDrawdownPct,
    tradeCount: state.tradeCount,
    costs: state.taxPaid + state.feesPaid,
    continueEnabled: won && portfolioHasRoomToContinue(state),
    hasRoomToContinue: portfolioHasRoomToContinue(state),
  })
  return {
    ...view,
    scores: [...view.scores, ...portfolioExternalNpcFigures(state)],
    reveal: revealRows(state),
    revealNote: REVEAL_NOTE,
  }
}
