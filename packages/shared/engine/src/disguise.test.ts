import { describe, expect, it } from 'vitest'
import { disguiseRoster, type RealCompany, toCapTier } from './disguise'
import { ANALYST_NOTE_KEYS, analystNote, FAMOUS_TICKERS, RESERVED_NAMES } from './disguise-copy'

const SEED = 4242

const COMPANIES: RealCompany[] = [
  {
    id: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Information Technology',
    industry: 'Technology Hardware, Storage & Peripherals',
    capTier: 'mega',
    dividendYieldPct: 0.4,
    volatilityPct: 31,
    fundamentals: null,
  },
  {
    id: 'KO',
    name: 'Coca-Cola',
    sector: 'Consumer Staples',
    industry: 'Soft Drinks & Non-alcoholic Beverages',
    capTier: 'mega',
    dividendYieldPct: 3,
    volatilityPct: 18,
    fundamentals: null,
  },
  {
    id: 'DUK',
    name: 'Duke Energy',
    sector: 'Utilities',
    industry: 'Electric Utilities',
    capTier: 'large',
    dividendYieldPct: 4,
    volatilityPct: 20,
    fundamentals: null,
  },
]

describe('toCapTier', () => {
  it('takes the buckets the bake writes', () => {
    expect(toCapTier('mid')).toBe('mid')
    expect(toCapTier('large')).toBe('large')
    expect(toCapTier('mega')).toBe('mega')
  })

  it('falls back to the commonest bucket rather than refusing to open a run', () => {
    expect(toCapTier('enormous')).toBe('large')
  })
})

describe('disguiseRoster', () => {
  it('keeps everything true about a company and changes only its name and ticker', () => {
    const [apple] = disguiseRoster(SEED, COMPANIES)
    expect(apple?.realName).toBe('Apple Inc.')
    expect(apple?.sector).toBe('Information Technology')
    expect(apple?.industry).toBe('Technology Hardware, Storage & Peripherals')
    expect(apple?.capTier).toBe('mega')
    expect(apple?.dividendYieldPct).toBe(0.4)
    expect(apple?.fakeName).not.toBe('Apple Inc.')
    expect(apple?.fakeTicker).not.toBe('AAPL')
  })

  it('produces the same disguise every time for one seed, so a replay reads the same', () => {
    expect(disguiseRoster(SEED, COMPANIES)).toEqual(disguiseRoster(SEED, COMPANIES))
  })

  it('reshuffles between seeds, so nobody can play from memory of a past run', () => {
    const first = disguiseRoster(SEED, COMPANIES).map((company) => company.fakeTicker)
    const second = disguiseRoster(SEED + 1, COMPANIES).map((company) => company.fakeTicker)
    expect(second).not.toEqual(first)
  })

  it('gives a company the same disguise even if the roster around it changes', () => {
    const whole = disguiseRoster(SEED, COMPANIES)
    const shorter = disguiseRoster(SEED, COMPANIES.slice(0, 2))
    expect(shorter[0]?.fakeTicker).toBe(whole[0]?.fakeTicker)
    expect(shorter[1]?.fakeTicker).toBe(whole[1]?.fakeTicker)
  })

  it('never hands out a name or a ticker twice in one run', () => {
    const disguised = disguiseRoster(SEED, COMPANIES)
    expect(new Set(disguised.map((company) => company.fakeTicker)).size).toBe(COMPANIES.length)
    expect(new Set(disguised.map((company) => company.fakeName)).size).toBe(COMPANIES.length)
  })

  it('never lands on a famous real ticker, nor on a ticker the roster really uses', () => {
    const forbidden = new Set([...FAMOUS_TICKERS, ...COMPANIES.map((company) => company.id)])
    for (let seed = 0; seed < 60; seed++) {
      for (const company of disguiseRoster(seed, COMPANIES)) {
        expect(forbidden.has(company.fakeTicker), `${seed} ${company.fakeTicker}`).toBe(false)
      }
    }
  })

  it('draws tickers of three or four letters, which is what a real board looks like', () => {
    for (const company of disguiseRoster(SEED, COMPANIES)) {
      expect(company.fakeTicker).toMatch(/^[A-Z]{3,4}$/)
    }
  })

  it('names a company after what its real sector does, so the sector stays a real signal', () => {
    const [, , duke] = disguiseRoster(SEED, COMPANIES)
    expect(duke?.fakeName).toMatch(/Power|Utilities|Grid|Water|Electric|Gas/)
  })

  it('gives every company a flavor note the copy table can render', () => {
    for (const company of disguiseRoster(SEED, COMPANIES)) {
      expect(ANALYST_NOTE_KEYS).toContain(company.analystNoteKey)
      expect(analystNote(company.analystNoteKey)).toMatch(/\S/)
    }
  })

  it('renders nothing for a note key it does not know', () => {
    expect(analystNote('not-a-note')).toBe('')
  })
})

describe('the name banks', () => {
  it('never produces a pair a real company already uses', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const company of disguiseRoster(seed, COMPANIES)) {
        for (const reserved of RESERVED_NAMES) {
          expect(company.fakeName.startsWith(reserved), `${seed} ${company.fakeName}`).toBe(false)
        }
      }
    }
  })
})
