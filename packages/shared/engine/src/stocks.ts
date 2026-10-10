import { disguiseRoster } from './disguise'
import { maxStartDay, minStartDay, startPortfolioRun as openRun } from './portfolio-run'
import type { Allocation, DisguisedCompany, PortfolioRunState } from './portfolio-state'
import type { RunLength } from './rules'
import { roster } from './stock-data'

/**
 * The company roster, as its own entry point.
 *
 * Everything reachable from `@dttm/engine` works without the roster, and everything that needs it
 * is here. A build that only ever opens index runs therefore never pulls the roster file into its
 * bundle, which is the whole reason this is a second entry point rather than four more exports on
 * the first one.
 */

export { analystNote } from './disguise-copy'
export type {
  Allocation,
  AssetSeries,
  BasketNpcState,
  CapTier,
  DisguisedCompany,
  FundamentalTrends,
  Holding,
  PortfolioRunState,
  RosterCompany,
  StockRoster,
  UniverseAsset,
} from './portfolio-state'

/** How many companies the roster carries. */
export const ROSTER_SIZE = roster.companies.length

/**
 * The roster as a run would present it, without opening one.
 *
 * The builder screen needs the disguised names, the sectors, and the industries before there is a
 * run to read them from, so it asks for them under the seed the run is about to be opened with.
 * Opening that run then produces the identical names, because both go through the same seeded
 * generator.
 */
export function browseRoster(seed: number): DisguisedCompany[] {
  return disguiseRoster(seed, roster.companies)
}

/** The real company behind a disguise, for the reveal when a run ends. */
export function realNameOf(assetId: string): string | undefined {
  return roster.companies.find((company) => company.id === assetId)?.name
}

/** Opens a portfolio run over the committed roster. See `portfolio-run.ts` for the rules. */
export function startPortfolioRun(
  seed: number,
  runLength: RunLength,
  allocations: readonly Allocation[]
): PortfolioRunState {
  return openRun(seed, runLength, allocations, roster)
}

/** The window of real history portfolio runs of a given length are drawn from. */
export function startDayRange(runLength: RunLength): { from: number; to: number } {
  return { from: minStartDay(roster), to: maxStartDay(runLength) }
}
