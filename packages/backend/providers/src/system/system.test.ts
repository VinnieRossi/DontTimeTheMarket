import { describe, expect, it } from 'vitest'
import { FixedClock, SystemClock } from './clock'
import { RandomIdGenerator, SequentialIdGenerator } from './id-generator'

describe('SystemClock', () => {
  it('reports a time at or after the moment it was asked', () => {
    const before = Date.now()
    const now = new SystemClock().now()
    expect(now.getTime()).toBeGreaterThanOrEqual(before)
  })
})

describe('FixedClock', () => {
  it('stays where it was put', () => {
    const start = new Date('2026-04-01T12:00:00.000Z')
    const clock = new FixedClock(start)
    expect(clock.now()).toEqual(start)
    expect(clock.now()).toEqual(start)
  })

  it('moves only when told, by exactly the interval given', () => {
    const clock = new FixedClock(new Date('2026-04-01T12:00:00.000Z'))
    clock.advance(90)
    expect(clock.now().toISOString()).toBe('2026-04-01T12:01:30.000Z')
  })
})

describe('RandomIdGenerator', () => {
  it('prefixes the identifier, so an id in a log line says what it names', () => {
    expect(new RandomIdGenerator().next('note')).toMatch(/^note_/)
  })

  it('does not repeat itself', () => {
    const ids = new RandomIdGenerator()
    expect(ids.next('note')).not.toBe(ids.next('note'))
  })
})

describe('SequentialIdGenerator', () => {
  it('counts, so a test can name the identifier it expects', () => {
    const ids = new SequentialIdGenerator()
    expect(ids.next('note')).toBe('note_1')
    expect(ids.next('note')).toBe('note_2')
  })

  it('counts each prefix separately', () => {
    const ids = new SequentialIdGenerator()
    expect(ids.next('note')).toBe('note_1')
    expect(ids.next('job')).toBe('job_1')
  })
})
