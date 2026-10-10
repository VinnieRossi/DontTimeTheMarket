import npcSeriesRaw from '../data/baked/npc-series.json' with { type: 'json' }
import { STARTING_CASH } from './rules'

/**
 * Three benchmark NPCs priced off their own real daily history rather than the game's internal
 * index: SPY for the S&P 500, QQQ for the Nasdaq-100, and BRK.A for Berkshire Hathaway.
 *
 * `scripts/bake-npc-series.ts` writes the committed series this module reads. Each is aligned to
 * the full grid `nasdaq.json` uses, with `null` for every day before the instrument's own first
 * print, which is what this module reads to decide whether an NPC is eligible for a given run.
 */

export type ExternalSeriesId = 'sp500' | 'nasdaq100' | 'berkshire'

interface BakedExternalSeries {
  close: readonly (number | null)[]
  dividends: readonly (readonly [number, number])[]
}

const npcSeries: Readonly<Record<ExternalSeriesId, BakedExternalSeries>> =
  npcSeriesRaw as unknown as Record<ExternalSeriesId, BakedExternalSeries>

export interface ExternalNpcState {
  id: string
  name: string
  cash: number
  shares: number
  seriesId: ExternalSeriesId
}

export interface ExternalNpcDefinition {
  id: string
  name: string
  seriesId: ExternalSeriesId
  /** One factual line identifying what this NPC tracks, shown as subtext under its figure. */
  note: string
}

export const EXTERNAL_NPC_DEFINITIONS: readonly ExternalNpcDefinition[] = [
  {
    id: 'sp500',
    name: 'S&P 500 NPC',
    seriesId: 'sp500',
    note: 'Tracks the SPY ETF, which tracks the S&P 500 index.',
  },
  {
    id: 'nasdaq100',
    name: 'Nasdaq-100 NPC',
    seriesId: 'nasdaq100',
    note: 'Tracks the QQQ ETF, which tracks the Nasdaq-100 index.',
  },
  {
    id: 'berkshire',
    name: 'Berkshire NPC',
    seriesId: 'berkshire',
    note: 'Tracks Berkshire Hathaway (BRK.A), the holding company run by Warren Buffett.',
  },
]

/** The close price for a series on a day, or undefined where the baked series carries no price. */
export function externalCloseAt(seriesId: ExternalSeriesId, day: number): number | undefined {
  return npcSeries[seriesId].close[day] ?? undefined
}

/** The per-share dividend a series paid on a day, or zero. */
export function externalDividendOn(seriesId: ExternalSeriesId, day: number): number {
  for (const [eventDay, amount] of npcSeries[seriesId].dividends) {
    if (eventDay === day) return amount
    if (eventDay > day) break
  }
  return 0
}

/**
 * The price an external NPC should be valued at on a day: its series' own close, or, failing
 * that, the last close before this day. The fallback should not normally fire, since all three
 * series extend at least as far as the main index does, but an NPC that is already part of a run
 * must never vanish or crash the run over a single missing print.
 */
function priceForValuation(seriesId: ExternalSeriesId, day: number): number {
  const price = externalCloseAt(seriesId, day)
  if (price !== undefined) return price
  for (let candidate = day - 1; candidate >= 0; candidate -= 1) {
    const earlier = externalCloseAt(seriesId, candidate)
    if (earlier !== undefined) return earlier
  }
  return 0
}

/**
 * The external NPCs eligible for a run starting on `startDay`: one per definition whose series
 * already has a real price at that day. A run drawn early enough in history (before 1980) gets
 * none of them; a run drawn after 1999 gets all three.
 */
export function createInitialExternalNpcs(startDay: number): ExternalNpcState[] {
  const npcs: ExternalNpcState[] = []
  for (const definition of EXTERNAL_NPC_DEFINITIONS) {
    const price = externalCloseAt(definition.seriesId, startDay)
    if (price === undefined) continue
    npcs.push({
      id: definition.id,
      name: definition.name,
      cash: 0,
      shares: STARTING_CASH / price,
      seriesId: definition.seriesId,
    })
  }
  return npcs
}

export function externalNpcValue(npc: ExternalNpcState, day: number): number {
  return npc.cash + npc.shares * priceForValuation(npc.seriesId, day)
}

/**
 * Reinvests any real per-share dividend paid today into each external NPC's shares, the same way
 * a basket benchmark reinvests in `portfolio-dividends.ts`. Returns the input array unchanged when
 * nothing was paid, so a caller that compares by reference sees nothing happened.
 */
export function payExternalNpcDividends(
  npcs: readonly ExternalNpcState[],
  day: number,
  taxMultiplier: number
): ExternalNpcState[] {
  let changed = false
  const next = npcs.map((npc) => {
    const perShare = externalDividendOn(npc.seriesId, day)
    if (perShare <= 0 || npc.shares <= 0) return npc
    const price = priceForValuation(npc.seriesId, day)
    if (price <= 0) return npc
    const payout = perShare * npc.shares * taxMultiplier
    changed = true
    return { ...npc, shares: npc.shares + payout / price }
  })
  return changed ? next : (npcs as ExternalNpcState[])
}
