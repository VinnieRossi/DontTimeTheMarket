import { describe, expect, it } from 'vitest'
import { macdFromMomentum, rsiFromMomentum, updateMomentum } from './momentum'
import type { MomentumState } from './state'
import { freshRun, tickTimes } from './test-support'

const EMPTY: MomentumState = { avgGain: 0, avgLoss: 0, ema12: null, ema26: null, signalEma: null }

describe('updateMomentum', () => {
  it('seeds both moving averages from the first price rather than from zero', () => {
    const state = freshRun(31)
    const after = updateMomentum(state)
    expect(after.momentum.ema12).toBe(after.momentum.ema26)
    expect(after.momentum.signalEma).toBeCloseTo(0, 10)
  })

  it('separates up days from down days into the gain and loss averages', () => {
    const walked = tickTimes(freshRun(31), 40).momentum
    expect(walked.avgGain).toBeGreaterThan(0)
    expect(walked.avgLoss).toBeGreaterThan(0)
  })

  it('keeps the two moving averages apart once prices have moved', () => {
    const walked = tickTimes(freshRun(31), 60).momentum
    expect(walked.ema12).not.toBe(walked.ema26)
  })
})

describe('rsiFromMomentum', () => {
  it('reads 100 when nothing has gone down, which has no ratio to take', () => {
    expect(rsiFromMomentum({ ...EMPTY, avgGain: 4, avgLoss: 0 })).toBe(100)
  })

  it('reads 50 when gains and losses are even', () => {
    expect(rsiFromMomentum({ ...EMPTY, avgGain: 3, avgLoss: 3 })).toBeCloseTo(50, 10)
  })

  it('stays inside its own scale', () => {
    const value = rsiFromMomentum(tickTimes(freshRun(8), 80).momentum)
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(100)
  })
})

describe('macdFromMomentum', () => {
  it('is the gap between the two moving averages', () => {
    expect(macdFromMomentum({ ...EMPTY, ema12: 12, ema26: 10 })).toBe(2)
  })

  it('reads zero before either average has a value', () => {
    expect(macdFromMomentum(EMPTY)).toBe(0)
  })
})
