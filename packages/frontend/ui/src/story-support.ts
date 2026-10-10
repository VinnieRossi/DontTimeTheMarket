import type { ChartMarkerView, ChartSeriesView } from './domain/chart-view'
import type { ChoiceView, FigureView, IndicatorTierView, SwitchItemView } from './domain/game-view'
import type {
  AllocationRowView,
  CompanyCardView,
  CompanyDetailView,
  HallOfFameView,
  HoldingRowView,
  RevealRowView,
} from './domain/portfolio-view'
import type { ChartLegendItem } from './molecules/ChartLegend'
import type { ReadoutItem } from './molecules/ReadoutList'

/**
 * Fixed sample data for the stories. Every number here is computed from its own index rather than
 * drawn at random, because a story is also a visual baseline: a story that renders something
 * slightly different each time it loads reports a change nobody made.
 */

const DAYS = 120

function wave(day: number, amplitude: number, period: number, drift: number): number {
  return 100 + drift * day + amplitude * Math.sin((day / period) * Math.PI * 2)
}

function points(amplitude: number, period: number, drift: number) {
  return Array.from({ length: DAYS }, (_, day) => ({
    day,
    value: Number(wave(day, amplitude, period, drift).toFixed(3)),
  }))
}

export const SAMPLE_SERIES: readonly ChartSeriesView[] = [
  { role: 'benchmark', points: points(6, 70, 0.1) },
  { role: 'price', points: points(8, 55, 0.08) },
  { role: 'player', points: points(4, 40, 0.14) },
]

export const SAMPLE_SERIES_WITH_OVERLAYS: readonly ChartSeriesView[] = [
  ...SAMPLE_SERIES,
  { role: 'sma20', points: points(5, 55, 0.08) },
  { role: 'sma50', points: points(3, 55, 0.08) },
]

export const SAMPLE_MARKERS: readonly ChartMarkerView[] = [
  { day: 18, value: 103.2, side: 'buy' },
  { day: 74, value: 109.4, side: 'sell' },
]

export const SAMPLE_LEGEND: readonly ChartLegendItem[] = [
  { role: 'price', label: 'Market price' },
  { role: 'player', label: 'Your value' },
  { role: 'benchmark', label: 'Bogle NPC' },
]

export const SAMPLE_READOUTS: readonly ReadoutItem[] = [
  { key: 'rsi', label: 'RSI (14)', value: '61.4' },
  { key: 'macd', label: 'MACD', value: '12.80' },
  { key: 'vix', label: 'Volatility index', value: '18.3' },
]

export const SAMPLE_SPEEDS: readonly ChoiceView[] = [
  { value: 'paused', label: 'Pause' },
  { value: '1x', label: '1x' },
  { value: '4x', label: '4x' },
  { value: '16x', label: '16x' },
]

export const SAMPLE_RUN_LENGTHS: readonly ChoiceView[] = [
  { value: 'short', label: 'Short - 1 year' },
  { value: 'standard', label: 'Standard - 3 years' },
  { value: 'long', label: 'Long - 10 years' },
]

export const SAMPLE_TILES: readonly FigureView[] = [
  { label: 'Cash', value: '$3,480' },
  { label: 'Position', value: '62.41 sh ($7,120)' },
  { label: 'Vs Bogle NPC', value: '+2.4%', direction: 'up' },
]

export const SAMPLE_SCORES: readonly FigureView[] = [
  { label: 'Total return', value: '18.4%' },
  { label: 'Max drawdown', value: '-12.1%' },
  { label: 'Trades placed', value: '14' },
  { label: 'Tax + fees paid', value: '$212' },
]

export const SAMPLE_INDICATOR_TIERS: readonly IndicatorTierView[] = [
  {
    name: 'Tier 1 - Chart stuff',
    items: [
      { key: 'sma', label: 'Moving averages (20/50)', checked: true },
      { key: 'volume', label: 'Volume', checked: false },
    ],
  },
  {
    name: 'Tier 2 - Technicals',
    items: [
      { key: 'rsi', label: 'RSI (14)', checked: true },
      { key: 'macd', label: 'MACD', checked: false },
      { key: 'bb', label: 'Bollinger Bands', checked: false },
      { key: 'atr', label: 'ATR (volatility)', checked: false },
    ],
  },
]

export const SAMPLE_SWITCHES: readonly SwitchItemView[] = [
  { key: 'fees', label: 'Trading fees & spread (3 bps)', checked: true },
  { key: 'tax', label: 'Capital gains tax', checked: true },
  { key: 'interest', label: 'Interest on idle cash', checked: true },
  { key: 'reinvestDividends', label: 'Auto-reinvest my dividends', checked: false },
]

/* The portfolio samples. Fixed like the rest, and disguised like a real run would be. */

export const SAMPLE_SECTOR_GROUPS: readonly ChoiceView[] = [
  { value: 'all', label: 'All sectors' },
  { value: 'Information Technology', label: 'Information Technology' },
  { value: 'Health Care', label: 'Health Care' },
  { value: 'Utilities', label: 'Utilities' },
]

export const SAMPLE_COMPANIES: readonly CompanyCardView[] = [
  {
    assetId: 'c1',
    ticker: 'NTHX',
    name: 'Northfield Analytics',
    sector: 'Information Technology',
    industry: 'Semiconductors',
    tags: ['Mega cap', '0.4% yield', '32% volatility'],
    selected: true,
  },
  {
    assetId: 'c2',
    ticker: 'CRWD',
    name: 'Crestwood Therapeutics Group',
    sector: 'Health Care',
    industry: 'Biotechnology',
    tags: ['Large cap', 'No dividend', '41% volatility'],
    selected: true,
  },
  {
    assetId: 'c3',
    ticker: 'OKHP',
    name: 'Oakhaven Power',
    sector: 'Utilities',
    industry: 'Electric Utilities',
    tags: ['Large cap', '4.7% yield', '19% volatility'],
    selected: false,
  },
  {
    assetId: 'c4',
    ticker: 'LNDN',
    name: 'Linden Freight Partners',
    sector: 'Industrials',
    industry: 'Rail Transportation',
    tags: ['Large cap', '2.1% yield', '24% volatility'],
    selected: false,
  },
]

export const SAMPLE_ALLOCATIONS: readonly AllocationRowView[] = [
  {
    assetId: 'c1',
    ticker: 'NTHX',
    name: 'Northfield Analytics',
    percent: '60%',
    canIncrease: true,
    canDecrease: true,
  },
  {
    assetId: 'c2',
    ticker: 'CRWD',
    name: 'Crestwood Therapeutics Group',
    percent: '40%',
    canIncrease: true,
    canDecrease: true,
  },
]

export const SAMPLE_HOLDINGS: readonly HoldingRowView[] = [
  {
    assetId: 'c1',
    ticker: 'NTHX',
    name: 'Northfield Analytics',
    detail: 'Information Technology - Semiconductors',
    value: '$4,180',
    weight: '41% now, 33% target',
    drift: '+8.0 pts',
    direction: 'up',
    spark: points(7, 50, 0.12),
  },
  {
    assetId: 'c2',
    ticker: 'CRWD',
    name: 'Crestwood Therapeutics Group',
    detail: 'Health Care - Biotechnology',
    value: '$2,960',
    weight: '29% now, 33% target',
    drift: '-4.0 pts',
    direction: 'down',
    spark: points(9, 35, -0.05),
  },
  {
    assetId: 'c3',
    ticker: 'OKHP',
    name: 'Oakhaven Power',
    detail: 'Utilities - Electric Utilities',
    value: '$3,020',
    weight: '30% now, 34% target',
    drift: '-4.0 pts',
    direction: 'down',
    spark: points(3, 60, 0.02),
  },
]

export const SAMPLE_COMPANY_DETAIL: CompanyDetailView = {
  assetId: 'c1',
  ticker: 'NTHX',
  name: 'Northfield Analytics',
  sector: 'Information Technology',
  industry: 'Semiconductors',
  stats: [
    { label: 'Size', value: 'Mega cap' },
    { label: 'Dividend yield', value: '0.4%' },
    { label: 'Volatility', value: '32% a year' },
    { label: 'Fiscal years shown', value: '7' },
  ],
  trends: [
    { label: 'Revenue', points: points(2, 200, 0.4), caption: 'Growing, steadily' },
    { label: 'Net margin', points: points(3, 160, 0.1), caption: 'Widening' },
    { label: 'Debt to equity', points: points(2, 140, -0.2), caption: 'Falling' },
  ],
  note: 'Valuation looks fair, for some value of fair.',
}

export const SAMPLE_HALL_OF_FAME: readonly HallOfFameView[] = [
  {
    name: 'Enron',
    note: 'An accounting fraud unwound into bankruptcy in 2001, taking the shares to nothing.',
  },
  {
    name: 'Lehman Brothers',
    note: 'Filed the largest bankruptcy in US history in September 2008.',
  },
]

export const SAMPLE_REVEAL: readonly RevealRowView[] = [
  {
    assetId: 'c1',
    ticker: 'NTHX',
    fakeName: 'Northfield Analytics',
    realName: 'Advanced Micro Devices',
    detail: 'Information Technology - Semiconductors',
  },
  {
    assetId: 'c2',
    ticker: 'CRWD',
    fakeName: 'Crestwood Therapeutics Group',
    realName: 'Gilead Sciences',
    detail: 'Health Care - Biotechnology',
  },
]
