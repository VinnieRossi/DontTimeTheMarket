import rosterRaw from '../data/baked/stocks.json' with { type: 'json' }
import type { StockRoster } from './portfolio-state'

/**
 * The baked company roster, committed rather than fetched. `scripts/bake-stocks.ts` writes this
 * file from public sources; nothing at runtime contacts any of them, so a portfolio run is
 * reproducible from the repository alone and the deployed app has no external dependency.
 *
 * This module is the only importer of the roster file, and the only way to reach it is the
 * package's `./stocks` entry point. That is deliberate: the roster is by far the largest thing
 * this repository ships, and keeping it out of the main entry's import graph is what lets an
 * index-mode page load without it.
 *
 * Every company's `close` array is positioned on the same trading-day grid the index series uses,
 * starting at `historyStartDay`, which is what lets one integer day index address the index, the
 * macro series, and every company at once.
 */
export const roster: StockRoster = rosterRaw
