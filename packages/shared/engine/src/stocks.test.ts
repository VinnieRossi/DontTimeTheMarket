import { describe, expect, it } from 'vitest'
import { SERIES_LENGTH } from './market-data'
import { portfolioValue } from './portfolio-selectors'
import { STARTING_CASH } from './rules'
import { roster } from './stock-data'
import { browseRoster, ROSTER_SIZE, realNameOf, startDayRange, startPortfolioRun } from './stocks'

const SEED = 606_060

describe('the baked roster', () => {
  it('carries companies across every sector a player can browse by', () => {
    const sectors = new Set(roster.companies.map((company) => company.sector))
    expect(ROSTER_SIZE).toBeGreaterThan(30)
    expect(sectors.size).toBeGreaterThanOrEqual(10)
  })

  it('spreads the companies across many industries rather than piling into a few', () => {
    const industries = new Set(roster.companies.map((company) => company.industry))
    expect(industries.size).toBeGreaterThan(ROSTER_SIZE / 2)
  })

  it('positions every company on the same trading-day grid, to the end of the series', () => {
    const expected = SERIES_LENGTH - roster.historyStartDay
    for (const company of roster.companies) {
      expect(company.close, company.id).toHaveLength(expected)
    }
  })

  it('carries a real, positive price for every day of every company', () => {
    for (const company of roster.companies) {
      expect(
        company.close.every((price) => Number.isFinite(price) && price > 0),
        company.id
      ).toBe(true)
    }
  })

  it('places every dividend event inside the window it belongs to', () => {
    const length = SERIES_LENGTH - roster.historyStartDay
    for (const company of roster.companies) {
      for (const [day, amount] of company.dividends) {
        expect((day ?? -1) >= 0 && (day ?? length) < length, company.id).toBe(true)
        expect((amount ?? 0) > 0, company.id).toBe(true)
      }
    }
  })

  it('names the real company behind a disguise, and nothing for a company it does not carry', () => {
    const [first] = roster.companies
    expect(realNameOf(first?.id ?? '')).toBe(first?.name)
    expect(realNameOf('NOT-A-COMPANY')).toBeUndefined()
  })
})

describe('browseRoster', () => {
  it('presents every company under a disguise, before there is a run to read it from', () => {
    const browse = browseRoster(SEED)
    expect(browse).toHaveLength(ROSTER_SIZE)
    expect(new Set(browse.map((company) => company.fakeTicker)).size).toBe(ROSTER_SIZE)
    expect(new Set(browse.map((company) => company.fakeName)).size).toBe(ROSTER_SIZE)
  })

  it('agrees with the run that seed opens, which is why the builder can show it first', () => {
    const browse = browseRoster(SEED)
    const run = startPortfolioRun(SEED, 'short', [{ assetId: browse[0]?.id ?? '', percent: 100 }])
    expect(run.universe.map((asset) => asset.company)).toEqual(browse)
  })
})

describe('startDayRange', () => {
  it('opens no earlier than the companies’ shared history and leaves room for the run', () => {
    const { from, to } = startDayRange('long')
    expect(from).toBeGreaterThan(roster.historyStartDay)
    expect(to).toBeLessThan(SERIES_LENGTH)
    expect(to - from).toBeGreaterThan(500)
  })

  it('gives a short run more windows to be drawn from than a long one', () => {
    const short = startDayRange('short')
    const long = startDayRange('long')
    expect(short.to).toBeGreaterThan(long.to)
  })
})

describe('startPortfolioRun over the committed roster', () => {
  it('opens a run on one company, which the rules allow', () => {
    const only = browseRoster(SEED)[0]?.id ?? ''
    const run = startPortfolioRun(SEED, 'short', [{ assetId: only, percent: 100 }])
    expect(run.holdings).toHaveLength(1)
    expect(portfolioValue(run)).toBeCloseTo(STARTING_CASH, 6)
  })

  it('rescales a draft that does not add up rather than refusing to open', () => {
    const browse = browseRoster(SEED)
    const run = startPortfolioRun(SEED, 'short', [
      { assetId: browse[0]?.id ?? '', percent: 30 },
      { assetId: browse[1]?.id ?? '', percent: 30 },
    ])
    expect(portfolioValue(run)).toBeCloseTo(STARTING_CASH, 6)
    expect(run.holdings.map((holding) => holding.targetPct)).toEqual([50, 50])
  })

  it('drops a company it does not carry and a company named twice', () => {
    const browse = browseRoster(SEED)
    const run = startPortfolioRun(SEED, 'short', [
      { assetId: browse[0]?.id ?? '', percent: 50 },
      { assetId: browse[0]?.id ?? '', percent: 25 },
      { assetId: 'NOT-A-COMPANY', percent: 25 },
    ])
    expect(run.holdings).toHaveLength(1)
  })

  it('opens an empty portfolio as all cash rather than throwing', () => {
    const run = startPortfolioRun(SEED, 'short', [])
    expect(run.holdings).toEqual([])
    expect(run.cash).toBeCloseTo(STARTING_CASH, 6)
    expect(portfolioValue(run)).toBeCloseTo(STARTING_CASH, 6)
  })
})
