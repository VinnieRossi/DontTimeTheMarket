import type { Allocation } from './portfolio-state'
import { MAX_HOLDINGS } from './rules'

/**
 * How a portfolio is composed before it is opened.
 *
 * One rule governs everything here: the percentages always total exactly 100. A builder that can
 * reach 97 or 103 has an invalid state a player has to notice and repair, so instead of validating
 * the total after the fact, every operation produces a valid set. Selecting or dropping a company
 * re-splits the money evenly; nudging one holding squeezes the others around it.
 *
 * The percentages are whole numbers. A stepper that produced 33.333 would show a rounded figure
 * that did not add up to what the run was actually opened with, and the fraction buys nothing a
 * player can perceive.
 */

export const TOTAL_PCT = 100

/**
 * Spreads `total` across `count` slots as whole numbers that sum to it exactly, giving the extra
 * points to the earliest slots.
 */
function spread(total: number, count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor(total / count)
  const remainder = total - base * count
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0))
}

/**
 * Distributes `total` across the given weights as whole numbers summing to it exactly, by largest
 * remainder. Weights that are all zero fall back to an even split, which is the only sensible
 * reading of "in proportion to nothing".
 */
function distribute(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((running, weight) => running + weight, 0)
  if (sum <= 0) return spread(total, weights.length)

  const exact = weights.map((weight) => (weight / sum) * total)
  const floors = exact.map((value) => Math.floor(value))
  let left = total - floors.reduce((running, value) => running + value, 0)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left_, right) => right.remainder - left_.remainder)

  const result = [...floors]
  for (const entry of byRemainder) {
    if (left <= 0) break
    result[entry.index] = (result[entry.index] ?? 0) + 1
    left -= 1
  }
  return result
}

export function allocationTotal(allocations: readonly Allocation[]): number {
  return allocations.reduce((sum, allocation) => sum + allocation.percent, 0)
}

/** Whether a draft is ready to open a run: it holds something, and it holds all of the money. */
export function isAllocationComplete(allocations: readonly Allocation[]): boolean {
  return allocations.length > 0 && allocationTotal(allocations) === TOTAL_PCT
}

/** Resets every selected company to an equal share, which is the common case in one tap. */
export function splitEvenly(allocations: readonly Allocation[]): Allocation[] {
  const shares = spread(TOTAL_PCT, allocations.length)
  return allocations.map((allocation, index) => ({
    assetId: allocation.assetId,
    percent: shares[index] ?? 0,
  }))
}

/**
 * Adds a company to the draft or drops it, then splits the money evenly again.
 *
 * Re-splitting on every selection is what keeps the total at 100 without the player ever seeing a
 * number that does not add up. Adding beyond the holding limit does nothing rather than silently
 * dropping an earlier pick.
 */
export function toggleAllocation(
  allocations: readonly Allocation[],
  assetId: string
): Allocation[] {
  const without = allocations.filter((allocation) => allocation.assetId !== assetId)
  if (without.length !== allocations.length) return splitEvenly(without)
  if (allocations.length >= MAX_HOLDINGS) return [...allocations]
  return splitEvenly([...allocations, { assetId, percent: 0 }])
}

/**
 * Nudges one holding by `deltaPct` and squeezes the rest around it so the total stays 100.
 *
 * The other holdings keep their weights relative to each other, so bumping one company up takes
 * the points from the others in the proportions the player had already chosen rather than from
 * whichever one happens to be first.
 */
export function stepAllocation(
  allocations: readonly Allocation[],
  assetId: string,
  deltaPct: number
): Allocation[] {
  const current = allocations.find((allocation) => allocation.assetId === assetId)
  if (current === undefined) return [...allocations]
  if (allocations.length === 1) return [{ assetId, percent: TOTAL_PCT }]

  const target = Math.min(TOTAL_PCT, Math.max(0, current.percent + deltaPct))
  const others = allocations.filter((allocation) => allocation.assetId !== assetId)
  const shares = distribute(
    TOTAL_PCT - target,
    others.map((allocation) => allocation.percent)
  )

  const rest = new Map(
    others.map((allocation, index) => [allocation.assetId, shares[index] ?? 0] as const)
  )
  return allocations.map((allocation) =>
    allocation.assetId === assetId
      ? { assetId, percent: target }
      : { assetId: allocation.assetId, percent: rest.get(allocation.assetId) ?? 0 }
  )
}
