import { describe, expect, it } from 'vitest'
import { isIndexRun, isPortfolioRun, type RunState } from './run-state'
import { freshPortfolioRun, freshRun } from './test-support'

describe('telling the two kinds of run apart', () => {
  const index: RunState = freshRun(8_080)
  const basket: RunState = freshPortfolioRun(8_080, 2)

  it('reads an index run as an index run and nothing else', () => {
    expect(isIndexRun(index)).toBe(true)
    expect(isPortfolioRun(index)).toBe(false)
  })

  it('reads a portfolio run as a portfolio run and nothing else', () => {
    expect(isPortfolioRun(basket)).toBe(true)
    expect(isIndexRun(basket)).toBe(false)
  })

  it('narrows to the shape a screen can then read without checking a field', () => {
    const runs: RunState[] = [index, basket]
    const described = runs.map((run) =>
      isPortfolioRun(run) ? `${run.holdings.length} holdings` : `${run.shares} shares`
    )
    expect(described).toEqual(['0 shares', '2 holdings'])
  })
})
