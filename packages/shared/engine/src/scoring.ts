import {
  MIN_SCORING_DAYS,
  RUN_LENGTH_DAYS,
  type RunLength,
  STARTING_CASH,
  TRADING_DAYS_PER_YEAR,
} from './rules'

/**
 * How a run is scored, written against figures rather than against a run.
 *
 * The leaderboard has to rank an index run and a portfolio run against each other, so the number
 * has to mean the same thing in both: annualized outperformance over the buy-and-hold version of
 * the same starting decision. Keeping the arithmetic here, taking only values and elapsed days,
 * is what makes that one definition rather than two that happen to agree today.
 */

export function elapsedYearsOf(elapsedDays: number): number {
  return Math.max(elapsedDays, 1) / TRADING_DAYS_PER_YEAR
}

/** Compound annual growth rate of a run that reached `value` after `elapsedDays` trading days. */
export function cagrOf(value: number, elapsedDays: number): number {
  const years = elapsedYearsOf(elapsedDays)
  if (years <= 0) return 0
  return (Math.max(value, 1) / STARTING_CASH) ** (1 / years) - 1
}

/**
 * Annualized outperformance over a benchmark, in basis points. CAGR normalizes for runs of
 * different lengths, so this is the score: it stays comparable whether a run lasted one year or
 * ten.
 */
export function edgeBpsOf(
  playerValue: number,
  benchmarkValue: number,
  elapsedDays: number
): number {
  return (cagrOf(playerValue, elapsedDays) - cagrOf(benchmarkValue, elapsedDays)) * 10000
}

/**
 * A plain running percentage gap, safe to show live during a run. The annualized edge figure
 * blows up to nonsensical magnitudes over very short elapsed-day counts (raising a small early
 * difference to a large power), so the screen shows this instead until a run actually ends. The
 * same small-sample problem is why cashing out is gated on a minimum number of elapsed days.
 */
export function runningGapPctOf(playerValue: number, benchmarkValue: number): number {
  if (benchmarkValue <= 0) return 0
  return ((playerValue - benchmarkValue) / benchmarkValue) * 100
}

/** The plain percentage gain or loss on the starting stake, for the end-of-run summary. */
export function totalReturnPctOf(playerValue: number): number {
  return (playerValue / STARTING_CASH - 1) * 100
}

export function canCashOutAfter(elapsedDays: number): boolean {
  return elapsedDays >= MIN_SCORING_DAYS
}

/**
 * Whether a series with `seriesLength` days has room for another run length after `day`. A run
 * that has reached the end of the data cannot be extended, however well it went.
 */
export function hasRoomAfter(day: number, runLength: RunLength, seriesLength: number): boolean {
  return day + RUN_LENGTH_DAYS[runLength] < seriesLength - 2
}
