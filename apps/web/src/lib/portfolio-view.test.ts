import {
  type Allocation,
  BOGLE_NPC_ID,
  MAX_HOLDINGS,
  MIN_SCORING_DAYS,
  type PortfolioRunState,
  type RunLength,
  splitEvenly,
  step,
  toggleAllocation,
} from '@dttm/engine'
import { browseRoster, startPortfolioRun } from '@dttm/engine/stocks'
import { describe, expect, it } from 'vitest'
import {
  ALL_SECTORS,
  allocationRows,
  allocationTotalLabel,
  canPickMore,
  companyCards,
  companyDetail,
  detailAction,
  HALL_OF_FAME,
  holdingRows,
  portfolioBenchmarkFigure,
  portfolioCashOutAction,
  portfolioChartView,
  portfolioDayLabel,
  portfolioEndScreenView,
  portfolioLegend,
  portfolioPendingOrders,
  portfolioPlayerFigure,
  portfolioReadouts,
  portfolioTiles,
  rebalanceAction,
  revealRows,
  sectorGroups,
  startAction,
  tradeSubject,
} from './portfolio-view'

/* Every run below names its seed, so a failure here is reproducible forever. */
const SEED = 20_260_109

const COMPANIES = browseRoster(SEED)

function draft(count: number): Allocation[] {
  return splitEvenly(
    COMPANIES.slice(0, count).map((company) => ({ assetId: company.id, percent: 0 }))
  )
}

function openRun(count = 3, runLength: RunLength = 'standard'): PortfolioRunState {
  return startPortfolioRun(SEED, runLength, draft(count))
}

function tick(state: PortfolioRunState, days: number): PortfolioRunState {
  let next = state
  for (let day = 0; day < days; day++) next = step(next, { type: 'TICK' })
  return next
}

describe('browsing the roster', () => {
  it('offers every sector plus a way back to all of them', () => {
    const groups = sectorGroups(COMPANIES)
    expect(groups[0]).toEqual({ value: ALL_SECTORS, label: 'All sectors' })
    expect(groups.length).toBeGreaterThan(10)
  })

  it('shows a generated name and ticker over a truthful sector and industry', () => {
    const [card] = companyCards(COMPANIES, [], ALL_SECTORS)
    const [company] = COMPANIES
    expect(card?.ticker).toBe(company?.fakeTicker)
    expect(card?.name).toBe(company?.fakeName)
    expect(card?.sector).toBe(company?.sector)
    expect(card?.industry).toBe(company?.industry)
  })

  it('never puts a real company name on a card', () => {
    const realNames = new Set(COMPANIES.map((company) => company.realName))
    for (const card of companyCards(COMPANIES, [], ALL_SECTORS)) {
      expect(realNames.has(card.name), card.name).toBe(false)
    }
  })

  it('narrows to one sector and back again', () => {
    const sector = COMPANIES[0]?.sector ?? ''
    const narrowed = companyCards(COMPANIES, [], sector)
    expect(narrowed.length).toBeGreaterThan(0)
    expect(narrowed.every((card) => card.sector === sector)).toBe(true)
    expect(companyCards(COMPANIES, [], ALL_SECTORS).length).toBeGreaterThan(narrowed.length)
  })

  it('says which companies are already picked', () => {
    const picked = draft(2)
    const cards = companyCards(COMPANIES, picked, ALL_SECTORS)
    expect(cards.filter((card) => card.selected)).toHaveLength(2)
  })

  it('states a dividend payer’s yield and says plainly when there is none', () => {
    const payer = COMPANIES.find((company) => company.dividendYieldPct > 0)
    const none = COMPANIES.find((company) => company.dividendYieldPct === 0)
    const cards = companyCards(COMPANIES, [], ALL_SECTORS)
    expect(cards.find((card) => card.assetId === payer?.id)?.tags.join(' ')).toMatch(/yield/)
    if (none !== undefined) {
      expect(cards.find((card) => card.assetId === none.id)?.tags).toContain('No dividend')
    }
  })
})

describe('one company’s panel', () => {
  it('shows the truthful facts and the trends as shapes with a sentence each', () => {
    const company = COMPANIES.find((candidate) => candidate.fundamentals !== null)
    if (company === undefined) throw new Error('the roster carries no fundamentals at all')
    const detail = companyDetail(company)
    expect(detail.ticker).toBe(company.fakeTicker)
    expect(detail.stats.map((stat) => stat.label)).toEqual([
      'Size',
      'Dividend yield',
      'Volatility',
      'Filings read',
    ])
    expect(detail.trends.map((trend) => trend.label)).toEqual([
      'Revenue',
      'Net margin',
      'Debt to equity',
    ])
    for (const trend of detail.trends) {
      expect(trend.caption, trend.label).toMatch(/\S/)
      expect(trend.points.length).toBeGreaterThan(1)
    }
    expect(detail.note).toMatch(/\S/)
  })

  it('shows no trends at all for a company whose filings could not be read', () => {
    const company = COMPANIES.find((candidate) => candidate.fundamentals === null)
    if (company === undefined) return
    const detail = companyDetail(company)
    expect(detail.trends).toEqual([])
    expect(detail.stats.find((stat) => stat.label === 'Filings read')?.value).toBe('None available')
  })

  it('offers to add a company that is not picked and says so when it already is', () => {
    expect(detailAction(false)).toEqual({ label: 'Add to portfolio', enabled: true })
    expect(detailAction(true).enabled).toBe(false)
  })
})

describe('splitting the money', () => {
  it('shows each holding with the share it was given', () => {
    const rows = allocationRows(draft(4), COMPANIES)
    expect(rows.map((row) => row.percent)).toEqual(['25%', '25%', '25%', '25%'])
    expect(rows[0]?.ticker).toBe(COMPANIES[0]?.fakeTicker)
  })

  it('cannot step the only holding there is, since it already holds everything', () => {
    const [only] = allocationRows(draft(1), COMPANIES)
    expect(only?.percent).toBe('100%')
    expect(only?.canIncrease).toBe(false)
    expect(only?.canDecrease).toBe(false)
  })

  it('says the money is all placed, which it always is', () => {
    expect(allocationTotalLabel(draft(3))).toContain('all placed')
  })

  it('says how much is left over for a draft that does not add up', () => {
    expect(allocationTotalLabel([{ assetId: 'x', percent: 90 }])).toContain('10% still to place')
    expect(allocationTotalLabel([{ assetId: 'x', percent: 110 }])).toContain('10% over')
  })

  it('refuses to start until something is picked, then offers it', () => {
    expect(startAction([])).toEqual({ label: 'Pick at least one company', enabled: false })
    expect(startAction(draft(2)).enabled).toBe(true)
  })

  it('refuses to start a draft that does not hold all of the money', () => {
    expect(startAction([{ assetId: 'x', percent: 80 }]).enabled).toBe(false)
  })

  it('stops offering more companies once the holding limit is reached', () => {
    let allocations: Allocation[] = []
    for (const company of COMPANIES.slice(0, MAX_HOLDINGS)) {
      allocations = toggleAllocation(allocations, company.id)
    }
    expect(canPickMore(allocations)).toBe(false)
    expect(canPickMore(draft(2))).toBe(true)
  })
})

describe('the running portfolio', () => {
  it('counts the day against the horizon that was chosen', () => {
    expect(portfolioDayLabel(openRun(2, 'short'))).toBe('Day 1 / 252')
    expect(portfolioDayLabel(tick(openRun(2, 'short'), 9))).toBe('Day 10 / 252')
  })

  it('charts the player against the benchmark and names both lines', () => {
    const run = tick(openRun(3), 30)
    expect(portfolioChartView(run).series.map((series) => series.role)).toEqual([
      'benchmark',
      'player',
    ])
    expect(portfolioLegend(run).map((item) => item.label)).toEqual(['Your portfolio', 'Bogle NPC'])
  })

  it('names the overlays a player switched on', () => {
    const run = step(tick(openRun(3), 30), { type: 'SET_INDICATOR', key: 'sma', value: true })
    expect(portfolioLegend(run).map((item) => item.label)).toContain('SMA 20')
  })

  it('opens level with the benchmark, since both bought the same basket', () => {
    const run = openRun(3)
    expect(portfolioPlayerFigure(run).value).toBe(portfolioBenchmarkFigure(run).value)
    expect(portfolioTiles(run)[2]).toMatchObject({ value: '+0.0%', direction: 'up' })
  })

  it('counts the companies it holds, in words that read for one of them too', () => {
    expect(portfolioTiles(openRun(1))[1]?.value).toBe('1 company')
    expect(portfolioTiles(openRun(3))[1]?.value).toBe('3 companies')
  })

  it('shows every holding with its weight, its target, and how far it has drifted', () => {
    const rows = holdingRows(tick(openRun(3), 400))
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row.weight).toMatch(/^\d+% now, \d+% target$/)
      expect(row.drift).toMatch(/^[+-]\d+\.\d pts$/)
      expect(row.value).toMatch(/^\$[\d,]+$/)
      expect(row.spark.length).toBeGreaterThan(1)
      expect(row.detail).toContain(' - ')
    }
  })

  it('names a holding by its disguise, never by the company behind it', () => {
    const run = openRun(3)
    const realNames = new Set(run.universe.map((asset) => asset.company.realName))
    for (const row of holdingRows(run)) {
      expect(realNames.has(row.name), row.name).toBe(false)
    }
  })

  it('offers a rebalance only once something has drifted off its target', () => {
    expect(rebalanceAction(openRun(3))).toEqual({
      label: 'Nothing to rebalance',
      enabled: false,
    })
    expect(rebalanceAction(tick(openRun(3), 400)).enabled).toBe(true)
  })

  it('locks cashing out until the run is long enough to score', () => {
    expect(portfolioCashOutAction(openRun(2)).enabled).toBe(false)
    expect(portfolioCashOutAction(tick(openRun(2), MIN_SCORING_DAYS)).enabled).toBe(true)
  })

  it('shows no readouts until a player switches one on', () => {
    expect(portfolioReadouts(openRun(2))).toEqual([])
    const withOne = step(tick(openRun(2), 20), { type: 'SET_INDICATOR', key: 'cpi', value: true })
    expect(portfolioReadouts(withOne)).toHaveLength(1)
  })

  it('lists the orders waiting for tomorrow, named by the company each one is for', () => {
    const drifted = tick(openRun(3), 400)
    expect(portfolioPendingOrders(drifted)).toEqual([])

    const queued = step(drifted, { type: 'REBALANCE' })
    const listed = portfolioPendingOrders(queued)
    expect(listed.length).toBe(queued.pending.length)
    for (const order of listed) {
      expect(order.description).toMatch(/^(buy|sell) \w+, fills tomorrow$/)
    }
  })

  it('names the company a trade panel is pointed at by its disguise', () => {
    const run = openRun(2)
    const holding = run.holdings[0]
    expect(tradeSubject(run, holding?.assetId ?? '')).toBe(
      run.universe.find((asset) => asset.company.id === holding?.assetId)?.company.fakeTicker
    )
  })
})

describe('the end of a portfolio run', () => {
  it('scores the run and reveals who the companies actually were', () => {
    const ended = step(tick(openRun(3), MIN_SCORING_DAYS), { type: 'CASH_OUT' })
    const view = portfolioEndScreenView(ended)
    expect(view.edge).toMatch(/^[+-]\d+ bps$/)
    expect(view.scores.map((score) => score.label)).toEqual([
      'Total return',
      'Max drawdown',
      'Trades placed',
      'Tax + fees paid',
      'S&P 500 NPC',
      'Nasdaq-100 NPC',
      'Berkshire NPC',
    ])
    expect(view.reveal).toHaveLength(3)
    for (const row of view.reveal) {
      expect(row.realName).toMatch(/\S/)
      expect(row.realName).not.toBe(row.fakeName)
    }
  })

  it('reveals a company that was traded and then sold out of, not only what is still held', () => {
    let run = tick(openRun(3), 60)
    const holding = run.holdings[0]
    if (holding === undefined) throw new Error('the run opened with no holdings')
    run = step(run, {
      type: 'PLACE_ORDER',
      order: {
        side: 'sell',
        orderType: 'market',
        assetId: holding.assetId,
        qty: holding.shares,
      },
    })
    run = tick(run, 1)
    expect(run.holdings).toHaveLength(2)
    expect(revealRows(run).map((row) => row.assetId)).toContain(holding.assetId)
  })

  it('agrees with the index scoreboard about what beating the benchmark reads like', () => {
    const ended = step(tick(openRun(3), MIN_SCORING_DAYS), { type: 'CASH_OUT' })
    const view = portfolioEndScreenView(ended)
    const won = view.edge.startsWith('+')
    expect(view.won).toBe(won)
    expect(view.heading).toContain('Bogle NPC')
  })

  it('offers no continue to a run that lost', () => {
    const ended = step(tick(openRun(3), MIN_SCORING_DAYS), { type: 'CASH_OUT' })
    if (portfolioEndScreenView(ended).won) return
    expect(portfolioEndScreenView(ended).continueAction.enabled).toBe(false)
  })
})

describe('the Hall of Fame', () => {
  it('names the famous collapses under their real names, with nothing to trade', () => {
    expect(HALL_OF_FAME.map((entry) => entry.name)).toEqual([
      'Enron',
      'Lehman Brothers',
      'Washington Mutual',
    ])
    for (const entry of HALL_OF_FAME) {
      expect(entry.note).toMatch(/\S/)
    }
  })

  it('holds none of them on the tradeable roster, since no free source carries their prices', () => {
    const names = new Set(COMPANIES.map((company) => company.realName))
    for (const entry of HALL_OF_FAME) {
      expect(names.has(entry.name), entry.name).toBe(false)
    }
  })
})

describe('the benchmark figure', () => {
  it('reads the basket the benchmark bought on day one', () => {
    const run = tick(openRun(3), 100)
    expect(portfolioBenchmarkFigure(run).label).toBe('Bogle NPC')
    expect(run.npcs[0]?.id).toBe(BOGLE_NPC_ID)
  })
})
