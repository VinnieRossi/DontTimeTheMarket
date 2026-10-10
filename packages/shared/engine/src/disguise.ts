import {
  ANALYST_NOTE_KEYS,
  DEFAULT_NAME_TRADE,
  FAMOUS_TICKERS,
  NAME_FIRST,
  NAME_SUFFIX,
  NAME_TRADE_BY_SECTOR,
  RESERVED_NAMES,
  TICKER_LETTERS,
} from './disguise-copy'
import type { CapTier, DisguisedCompany, FundamentalTrends } from './portfolio-state'
import { nextInt, pickFrom } from './rng'

/**
 * The disguise. Every company on the roster gets a generated name and ticker for the length of
 * one run, so a player picks on sector, fundamentals, and the shape of a price line rather than
 * on which logo they recognize.
 *
 * Two properties matter and both come from seeding the generator rather than randomizing it:
 *
 * - Stable inside a run, so the same company reads the same on every screen and a replay of the
 *   run's action log from its seed produces the same names it was played under.
 * - Reshuffled between runs, so nobody can learn that one ticker is always one company and play
 *   from memory instead of from what is on the screen.
 *
 * The real name rides along from the start and is shown when the run ends. It has to: the reveal
 * is the payoff, and a disguise that could not be lifted would make the whole roster unverifiable.
 */

/** What the generator needs about a company, which is everything true about it. */
export interface RealCompany {
  id: string
  name: string
  sector: string
  industry: string
  capTier: string
  dividendYieldPct: number
  volatilityPct: number
  fundamentals: FundamentalTrends | null
}

const CAP_TIERS: readonly CapTier[] = ['mid', 'large', 'mega']

/**
 * Narrows the size bucket the baked roster carries. A value the bake never writes reads as
 * "large" rather than throwing: a roster entry with an odd label is still perfectly playable, and
 * refusing to open a run over it would be a worse answer than showing the commonest bucket.
 */
export function toCapTier(value: string): CapTier {
  return CAP_TIERS.find((tier) => tier === value) ?? 'large'
}

/**
 * Folds a company's real ticker into the run's seed, so each company draws from its own place in
 * the sequence rather than from wherever the roster happens to put it. Two runs on the same seed
 * therefore agree company by company even if the roster is re-baked with companies added or
 * removed.
 */
function seedFor(runSeed: number, ticker: string): number {
  let hash = runSeed | 0
  for (const character of ticker) {
    hash = (Math.imul(hash ^ character.charCodeAt(0), 0x01000193) + 0x9e3779b9) | 0
  }
  return hash
}

interface Draw<T> {
  state: number
  value: T
}

function drawTicker(state: number, length: number): Draw<string> {
  let current = state
  let ticker = ''
  for (let index = 0; index < length; index++) {
    const draw = nextInt(current, TICKER_LETTERS.length)
    current = draw.state
    ticker += TICKER_LETTERS[draw.value] ?? 'X'
  }
  return { state: current, value: ticker }
}

/**
 * Draws a ticker that is not taken: not a famous real one, not one of this roster's own real
 * tickers, and not one already handed to another company in this run. Three letters are tried
 * first and four after a few failures, so the run reads mostly like a real board without the
 * search ever running out of room.
 */
function drawFreeTicker(state: number, taken: ReadonlySet<string>): Draw<string> {
  let current = state
  for (let attempt = 0; attempt < 40; attempt++) {
    const draw = drawTicker(current, attempt < 8 ? 3 : 4)
    current = draw.state
    if (!taken.has(draw.value)) return { state: current, value: draw.value }
  }
  // Unreachable in practice: a four-letter draw has hundreds of thousands of candidates against a
  // few hundred taken names. Enumerating keeps the function total rather than throwing here.
  for (const first of TICKER_LETTERS) {
    for (const second of TICKER_LETTERS) {
      for (const third of TICKER_LETTERS) {
        const candidate = `Z${first}${second}${third}`
        if (!taken.has(candidate)) return { state: current, value: candidate }
      }
    }
  }
  return { state: current, value: 'ZZZZ' }
}

/**
 * Draws a name as a place or quality, then what the company does, then a corporate ending on
 * about half of them, which is roughly how a real board of company names reads.
 */
function drawName(state: number, sector: string, taken: ReadonlySet<string>): Draw<string> {
  let current = state
  for (let attempt = 0; attempt < 24; attempt++) {
    const first = pickFrom(current, NAME_FIRST)
    const trade = pickFrom(first.state, NAME_TRADE_BY_SECTOR[sector] ?? DEFAULT_NAME_TRADE)
    const suffix = pickFrom(trade.state, NAME_SUFFIX)
    const ending = nextInt(suffix.state, 2)
    current = ending.state
    const stem = `${first.value} ${trade.value}`
    if (RESERVED_NAMES.includes(stem)) continue
    const name = ending.value === 0 ? stem : `${stem} ${suffix.value}`
    if (!taken.has(name)) return { state: current, value: name }
  }
  return { state: current, value: `Holding Company ${taken.size + 1}` }
}

/**
 * Disguises a whole roster at once.
 *
 * It is done in one pass rather than per company because uniqueness is a property of the set: two
 * companies sharing a generated ticker would read as the same company on two cards. The companies
 * are taken in the order given, which the roster fixes, so the result depends only on the seed.
 */
export function disguiseRoster(
  runSeed: number,
  companies: readonly RealCompany[]
): DisguisedCompany[] {
  const takenTickers = new Set<string>([
    ...FAMOUS_TICKERS,
    ...companies.map((company) => company.id.replace('.', '')),
  ])
  const takenNames = new Set<string>()
  const disguised: DisguisedCompany[] = []

  for (const company of companies) {
    let state = seedFor(runSeed, company.id)
    const ticker = drawFreeTicker(state, takenTickers)
    state = ticker.state
    const name = drawName(state, company.sector, takenNames)
    state = name.state
    const note = pickFrom(state, ANALYST_NOTE_KEYS)

    takenTickers.add(ticker.value)
    takenNames.add(name.value)
    disguised.push({
      id: company.id,
      fakeTicker: ticker.value,
      fakeName: name.value,
      realName: company.name,
      sector: company.sector,
      industry: company.industry,
      capTier: toCapTier(company.capTier),
      dividendYieldPct: company.dividendYieldPct,
      volatilityPct: company.volatilityPct,
      analystNoteKey: note.value,
      fundamentals: company.fundamentals,
    })
  }

  return disguised
}
