import { describe, expect, it } from 'vitest'
import { queryKeys, STALE_TIME } from './keys'

describe('query keys', () => {
  it('nests every note key under one prefix, so invalidating the group reaches all of them', () => {
    expect(queryKeys.notes.list({})[0]).toBe('notes')
    expect(queryKeys.notes.detail('note_1')[0]).toBe('notes')
    expect(queryKeys.notes.all[0]).toBe('notes')
  })

  it('separates one list filter from another, so two filters do not share a cache entry', () => {
    expect(queryKeys.notes.list({ status: 'draft' })).not.toEqual(
      queryKeys.notes.list({ status: 'published' })
    )
  })

  it('gives the same filter the same key, so a repeat render reuses the cached page', () => {
    expect(queryKeys.notes.list({ limit: 10 })).toEqual(queryKeys.notes.list({ limit: 10 }))
  })

  it('separates one note from another', () => {
    expect(queryKeys.notes.detail('note_1')).not.toEqual(queryKeys.notes.detail('note_2'))
  })
})

describe('stale times', () => {
  it('orders the tiers from longest-lived to always-refetch', () => {
    expect(STALE_TIME.reference).toBeGreaterThan(STALE_TIME.active)
    expect(STALE_TIME.active).toBeGreaterThan(STALE_TIME.live)
    expect(STALE_TIME.live).toBe(0)
  })
})
