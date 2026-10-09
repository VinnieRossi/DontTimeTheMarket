import type { ListNotesOutput, Note } from '@dttm/contracts'
import type { ApiClient } from './client'

/**
 * A client that answers from memory. Every route has a benign default, so a test overrides only
 * the one call it is exercising, including the rejection it wants on the failure path. Nothing here
 * opens a socket, which is what lets the binding layer be tested at all.
 */
export const SAMPLE_NOTE: Note = {
  id: 'note_1',
  title: 'A note',
  body: 'Some body',
  status: 'draft',
  authorId: 'u_author',
  createdAt: new Date('2026-04-01T12:00:00.000Z'),
  updatedAt: new Date('2026-04-01T12:00:00.000Z'),
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return { ...SAMPLE_NOTE, ...overrides }
}

const emptyList: ListNotesOutput = { notes: [], nextCursor: null }

export interface FakeApiParts {
  health?: ApiClient['health']
  list?: ApiClient['notes']['list']
  getById?: ApiClient['notes']['getById']
  create?: ApiClient['notes']['create']
  update?: ApiClient['notes']['update']
}

export function makeFakeApi(parts: FakeApiParts = {}): ApiClient {
  return {
    health:
      parts.health ??
      (() => Promise.resolve({ status: 'ok', uptimeSeconds: 1, mockedProviders: [] })),
    notes: {
      list: parts.list ?? (() => Promise.resolve(emptyList)),
      getById: parts.getById ?? (() => Promise.resolve(makeNote())),
      create: parts.create ?? (() => Promise.resolve(makeNote())),
      update: parts.update ?? (() => Promise.resolve(makeNote())),
    },
  }
}
