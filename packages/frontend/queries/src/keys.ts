import type { ListNotesInput } from '@dttm/contracts'

/**
 * Every cache key in one place. Keys scattered across call sites make invalidation guesswork:
 * somebody invalidates `['notes']` while the query that holds the data was keyed `['note', id]`,
 * and the screen keeps showing what it showed before.
 */
export const queryKeys = {
  notes: {
    all: ['notes'] as const,
    list: (input: ListNotesInput) => ['notes', 'list', input] as const,
    detail: (id: string) => ['notes', 'detail', id] as const,
  },
  health: ['health'] as const,
}

/**
 * How long data stays fresh before it is fetched again, by how quickly the thing actually changes.
 * These are named rather than written per call, so two screens showing the same data do not
 * disagree about how stale it may be.
 */
export const STALE_TIME = {
  /** Reference data: changes occasionally, and a stale read is harmless. */
  reference: 5 * 60 * 1000,
  /** Active data: a list somebody is working in. */
  active: 60 * 1000,
  /** Always refetch. For data where showing yesterday's value is worse than a spinner. */
  live: 0,
} as const
