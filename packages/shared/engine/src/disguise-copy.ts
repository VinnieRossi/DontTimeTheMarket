/**
 * The words a generated company name is built from, and the real tickers a generated one is kept
 * away from.
 *
 * The banks are deliberately bland. A generated name has one job, which is to be forgettable
 * enough that a player judges the company on its sector, its fundamentals, and the shape of its
 * price line rather than on a brand they already have an opinion about.
 */

/**
 * The first word: a place or a quality.
 *
 * The strongly branded ones a real listed company already owns are deliberately absent. A name
 * like "Clearwater Analytics" or "Cardinal Health" would hand a player a hint about a company
 * that has nothing to do with the one they are looking at, which is worse than no disguise at
 * all, so the words that produce those are not in the bank in the first place.
 */
export const NAME_FIRST: readonly [string, ...string[]] = [
  'Northfield',
  'Crestwood',
  'Ashbury',
  'Redstone',
  'Fairmount',
  'Lakeside',
  'Westbrook',
  'Harborview',
  'Ironwood',
  'Cedarline',
  'Brightwater',
  'Stonebridge',
  'Kingsford',
  'Maplegrove',
  'Riverbend',
  'Silverton',
  'Oakhaven',
  'Whitfield',
  'Easton',
  'Thornbury',
  'Hollowbrook',
  'Linden',
  'Marchmont',
  'Quarryhill',
  'Wrenfield',
  'Halloway',
  'Dunmore',
  'Castleton',
  'Brackenhill',
  'Oldbury',
  'Falkmere',
  'Netherby',
]

/**
 * Pairs the banks above can still produce that a real company already uses.
 *
 * It is a short, best-effort list rather than a claim to completeness: there is no free register
 * of every company name in the world to check against, and the generator cannot promise never to
 * coincide with one. What it can do is avoid the coincidences somebody has actually noticed,
 * which is what this is for. A pair named here is skipped and the draw moves on.
 */
export const RESERVED_NAMES: readonly string[] = [
  'Crestwood Midstream',
  'Ironwood Pharmaceutical',
  'Linden Capital',
  'Westbrook Partners',
  'Castleton Energy',
  'Stonebridge Capital',
  'Fairmount Materials',
]

/**
 * The second word: what the company does, drawn from a pool that suits its real sector.
 *
 * It is matched to the sector rather than shared, for the same reason the suffix is: an
 * industrial-sounding word on a biotech would be a tell in the other direction, and a name that
 * read "Robotics Utilities" would just read as a bug.
 */
export const NAME_TRADE_BY_SECTOR: Readonly<Record<string, readonly [string, ...string[]]>> = {
  'Communication Services': [
    'Media',
    'Broadcasting',
    'Interactive',
    'Networks',
    'Studios',
    'Telecom',
    'Publishing',
  ],
  'Consumer Discretionary': [
    'Brands',
    'Retail',
    'Outfitters',
    'Leisure',
    'Motors',
    'Homeware',
    'Apparel',
  ],
  'Consumer Staples': ['Foods', 'Provisions', 'Beverage', 'Household', 'Grocers', 'Produce'],
  Energy: ['Petroleum', 'Energy', 'Drilling', 'Midstream', 'Refining', 'Resources'],
  Financials: ['Financial', 'Bancorp', 'Underwriters', 'Capital', 'Mutual', 'Assurance'],
  'Health Care': [
    'Therapeutics',
    'Diagnostics',
    'Biosciences',
    'Medical',
    'Health',
    'Pharmaceutical',
  ],
  Industrials: [
    'Industries',
    'Manufacturing',
    'Machinery',
    'Freight',
    'Fabrication',
    'Engineering',
    'Aerospace',
  ],
  'Information Technology': [
    'Technologies',
    'Systems',
    'Semiconductor',
    'Software',
    'Analytics',
    'Computing',
    'Robotics',
  ],
  Materials: ['Materials', 'Chemical', 'Mining', 'Aggregates', 'Alloys', 'Packaging'],
  'Real Estate': ['Properties', 'Realty', 'Estates', 'Storage', 'Land', 'Developments'],
  Utilities: ['Power', 'Utilities', 'Grid', 'Water', 'Electric', 'Gas'],
}

export const DEFAULT_NAME_TRADE: readonly [string, ...string[]] = [
  'Industries',
  'Holdings',
  'Group',
]

/**
 * The corporate ending, drawn on about half of the names so the board reads like a real one,
 * where some companies carry a legal form in the name and some do not. It is sector-neutral
 * because the word before it has already said what the company does.
 */
export const NAME_SUFFIX: readonly [string, ...string[]] = [
  'Group',
  'Holdings',
  'Partners',
  'Corp',
  'Company',
  'Collective',
]

/** The letters a generated ticker is drawn from, weighted toward ones real tickers favor. */
export const TICKER_LETTERS = 'ABCDEFGHIKLMNOPRSTUVWXZ'

/**
 * Real tickers a generated one must never land on. Colliding with a famous ticker would hand a
 * player a hint about a company that has nothing to do with the one they are looking at, which is
 * worse than no disguise at all. The run's own roster is excluded separately, at generation time.
 */
export const FAMOUS_TICKERS: readonly string[] = [
  'AAL',
  'AAPL',
  'ABBV',
  'ABNB',
  'ABT',
  'ACN',
  'ADBE',
  'ADP',
  'AIG',
  'AMAT',
  'AMC',
  'AMD',
  'AMGN',
  'AMZN',
  'AVGO',
  'AXP',
  'BA',
  'BABA',
  'BAC',
  'BBY',
  'BIIB',
  'BK',
  'BKNG',
  'BLK',
  'BMY',
  'BP',
  'BRK',
  'BUD',
  'BX',
  'C',
  'CAT',
  'CB',
  'CCL',
  'CL',
  'CMCSA',
  'COF',
  'COIN',
  'COP',
  'COST',
  'CRM',
  'CSCO',
  'CVS',
  'CVX',
  'DAL',
  'DE',
  'DELL',
  'DIS',
  'DOW',
  'DUK',
  'EBAY',
  'ED',
  'EOG',
  'ETSY',
  'EXPE',
  'F',
  'FDX',
  'GE',
  'GILD',
  'GIS',
  'GM',
  'GME',
  'GOOG',
  'GOOGL',
  'GS',
  'HAL',
  'HD',
  'HOG',
  'HON',
  'HPQ',
  'IBM',
  'INTC',
  'INTU',
  'JNJ',
  'JPM',
  'K',
  'KHC',
  'KMB',
  'KO',
  'LLY',
  'LMT',
  'LOW',
  'LUV',
  'LYFT',
  'MA',
  'MCD',
  'MDT',
  'MET',
  'META',
  'MMM',
  'MO',
  'MRK',
  'MRNA',
  'MS',
  'MSFT',
  'MU',
  'NFLX',
  'NKE',
  'NOC',
  'NOW',
  'NVDA',
  'ORCL',
  'OXY',
  'PEP',
  'PFE',
  'PG',
  'PLTR',
  'PM',
  'PYPL',
  'QCOM',
  'RBLX',
  'RCL',
  'RIVN',
  'ROKU',
  'RTX',
  'SBUX',
  'SHOP',
  'SLB',
  'SNAP',
  'SO',
  'SPOT',
  'SQ',
  'T',
  'TGT',
  'TJX',
  'TMO',
  'TMUS',
  'TSLA',
  'TSM',
  'TWLO',
  'TXN',
  'UAL',
  'UBER',
  'UNH',
  'UNP',
  'UPS',
  'USB',
  'V',
  'VZ',
  'WBA',
  'WFC',
  'WMT',
  'X',
  'XOM',
  'YUM',
  'ZM',
]

/**
 * Flavor commentary, keyed, so the words can change without changing what a run recorded. It
 * exists because a stats panel with nothing written on it reads as a panel that is missing
 * something, and because the lines are meant to sound exactly as useful as real analyst copy.
 */
export const ANALYST_NOTES: Readonly<Record<string, string>> = {
  'note-1': 'Well positioned for the quarters ahead, assuming the quarters cooperate.',
  'note-2': 'Management has reiterated its commitment to reiterating things.',
  'note-3': 'Valuation looks fair, for some value of fair.',
  'note-4': 'A compelling story for patient investors, which is every story.',
  'note-5': 'Execution has been solid in the segments that were already solid.',
  'note-6': 'Headwinds are expected to abate, or alternatively to continue.',
  'note-7': 'Cost discipline remains a focus area, as it has for several years.',
  'note-8': 'The long-term thesis is intact, by definition of long-term.',
  'note-9': 'We see optionality here, which is a word we like very much.',
  'note-10': 'Recent results were in line, give or take the parts that were not.',
  'note-11': 'The company continues to operate in a competitive environment.',
  'note-12': 'Guidance was raised, lowered, or maintained, depending on the metric.',
}

export const ANALYST_NOTE_KEYS: readonly [string, ...string[]] = [
  'note-1',
  'note-2',
  'note-3',
  'note-4',
  'note-5',
  'note-6',
  'note-7',
  'note-8',
  'note-9',
  'note-10',
  'note-11',
  'note-12',
]

/** The line for a key, or an empty string when there is none. */
export function analystNote(key: string): string {
  return ANALYST_NOTES[key] ?? ''
}
