import {
  isPortfolioRun,
  MIN_SCORING_DAYS,
  SPEED_MS,
  STARTING_CASH,
  splitEvenly,
} from '@dttm/engine'
import { browseRoster, startPortfolioRun } from '@dttm/engine/stocks'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { drawSeed } from './seed'
import { useGame } from './use-game'

const SEED = 4242

function openRun() {
  const rendered = renderHook(() => useGame({ createSeed: () => SEED }))
  act(() => rendered.result.current.startRun('standard'))
  return rendered
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useGame', () => {
  it('holds no run until one is started', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.state).toBeNull()
  })

  it('opens a run from the seed it was given, which is what makes a failure reproducible', () => {
    const { result } = openRun()
    expect(result.current.state?.seed).toBe(SEED)
    expect(result.current.state?.cash).toBe(STARTING_CASH)
  })

  it('draws its own seed when nothing supplies one', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.startRun('short'))
    expect(result.current.state?.seed).toBeGreaterThanOrEqual(0)
  })

  it('ignores an action that is not the start of a run while there is no run', () => {
    const { result } = renderHook(() => useGame())
    act(() => result.current.dispatch({ type: 'TICK' }))
    expect(result.current.state).toBeNull()
  })

  it('advances a day on its own at the speed the run is set to', () => {
    const { result } = openRun()
    const day = result.current.state?.day ?? 0

    act(() => vi.advanceTimersByTime(SPEED_MS['1x'] * 3))
    expect(result.current.state?.day).toBe(day + 3)
  })

  it('stops the clock when the run is paused', () => {
    const { result } = openRun()
    act(() => result.current.dispatch({ type: 'SET_SPEED', speed: 'paused' }))
    const day = result.current.state?.day ?? 0

    act(() => vi.advanceTimersByTime(SPEED_MS['1x'] * 10))
    expect(result.current.state?.day).toBe(day)
  })

  it('runs faster when asked to', () => {
    const { result } = openRun()
    act(() => result.current.dispatch({ type: 'SET_SPEED', speed: '16x' }))

    act(() => vi.advanceTimersByTime(SPEED_MS['16x'] * 4))
    expect(result.current.state?.day).toBeGreaterThan((result.current.state?.startDay ?? 0) + 3)
  })

  it('stops the clock once the run has ended', () => {
    const { result } = openRun()
    act(() => vi.advanceTimersByTime(SPEED_MS['1x'] * MIN_SCORING_DAYS))
    act(() => result.current.dispatch({ type: 'CASH_OUT' }))
    expect(result.current.state?.phase).toBe('ended')
    const day = result.current.state?.day ?? 0

    act(() => vi.advanceTimersByTime(SPEED_MS['1x'] * 5))
    expect(result.current.state?.day).toBe(day)
  })

  it('goes back to having no run at all on a reset', () => {
    const { result } = openRun()
    act(() => result.current.reset())
    expect(result.current.state).toBeNull()
  })

  it('starts a second run after a reset', () => {
    const { result } = openRun()
    act(() => result.current.reset())
    act(() => result.current.startRun('long'))
    expect(result.current.state?.runLength).toBe('long')
  })

  it('takes over a portfolio run opened elsewhere and then drives it like any other', () => {
    const picks = browseRoster(SEED)
      .slice(0, 3)
      .map((company) => ({ assetId: company.id, percent: 0 }))
    const run = startPortfolioRun(SEED, 'standard', splitEvenly(picks))

    const { result } = renderHook(() => useGame({ createSeed: () => SEED }))
    act(() => result.current.openRun(run))

    const state = result.current.state
    expect(state).not.toBeNull()
    expect(state !== null && isPortfolioRun(state)).toBe(true)
    expect(state?.seed).toBe(SEED)

    const day = state?.day ?? 0
    act(() => vi.advanceTimersByTime(SPEED_MS['1x'] * 3))
    expect(result.current.state?.day).toBe(day + 3)
  })
})

describe('drawSeed', () => {
  it('draws a seed inside the range the engine takes', () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const seed = drawSeed()
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThanOrEqual(0xffffffff)
    }
  })
})
