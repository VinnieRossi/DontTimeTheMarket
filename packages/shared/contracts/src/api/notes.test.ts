import { describe, expect, it } from 'vitest'
import { ListNotesOutputSchema, NoteSchema } from './notes'

const row = {
  id: 'n_1',
  title: 'A note',
  body: 'Some body',
  status: 'draft' as const,
  authorId: 'u_1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('note output schemas', () => {
  it('accepts a row exactly as the database produces it', () => {
    expect(NoteSchema.parse(row)).toEqual(row)
  })

  it('rejects a row with a status the database enum does not contain', () => {
    expect(NoteSchema.safeParse({ ...row, status: 'pending' }).success).toBe(false)
  })

  it('rejects a row missing a column the schema declares as required', () => {
    const { title: _title, ...withoutTitle } = row
    expect(NoteSchema.safeParse(withoutTitle).success).toBe(false)
  })

  it('requires the list output to say whether another page exists', () => {
    expect(ListNotesOutputSchema.parse({ notes: [row], nextCursor: null }).nextCursor).toBe(null)
    expect(ListNotesOutputSchema.safeParse({ notes: [row] }).success).toBe(false)
  })

  it('rejects an empty cursor, which would read as the start rather than as no more pages', () => {
    expect(ListNotesOutputSchema.safeParse({ notes: [], nextCursor: '' }).success).toBe(false)
  })
})
