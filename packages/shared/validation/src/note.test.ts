import { describe, expect, it } from 'vitest'
import {
  BODY_MAX,
  CreateNoteInputSchema,
  ListNotesInputSchema,
  MAX_PAGE_SIZE,
  TITLE_MAX,
  UpdateNoteInputSchema,
} from './note'

describe('CreateNoteInputSchema', () => {
  it('accepts a minimal valid note', () => {
    expect(CreateNoteInputSchema.parse({ title: 'A note', body: 'Some body' })).toEqual({
      title: 'A note',
      body: 'Some body',
    })
  })

  it('trims the fields it accepts, so whitespace is not stored as content', () => {
    expect(CreateNoteInputSchema.parse({ title: '  A note  ', body: ' b ' }).title).toBe('A note')
  })

  it('rejects a title that is only whitespace', () => {
    expect(CreateNoteInputSchema.safeParse({ title: '   ', body: 'b' }).success).toBe(false)
  })

  it('rejects a title or body past its limit', () => {
    expect(
      CreateNoteInputSchema.safeParse({ title: 'x'.repeat(TITLE_MAX + 1), body: 'b' }).success
    ).toBe(false)
    expect(
      CreateNoteInputSchema.safeParse({ title: 't', body: 'x'.repeat(BODY_MAX + 1) }).success
    ).toBe(false)
  })

  it('accepts a status drawn from the database enum and rejects anything else', () => {
    expect(
      CreateNoteInputSchema.safeParse({ title: 't', body: 'b', status: 'published' }).success
    ).toBe(true)
    expect(
      CreateNoteInputSchema.safeParse({ title: 't', body: 'b', status: 'pending' }).success
    ).toBe(false)
  })
})

describe('UpdateNoteInputSchema', () => {
  it('accepts a single changed field', () => {
    expect(UpdateNoteInputSchema.safeParse({ id: 'n_1', status: 'archived' }).success).toBe(true)
  })

  it('rejects an update that changes nothing', () => {
    const result = UpdateNoteInputSchema.safeParse({ id: 'n_1' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('An update has to change at least one field')
    }
  })

  it('rejects a missing id', () => {
    expect(UpdateNoteInputSchema.safeParse({ status: 'archived' }).success).toBe(false)
  })
})

describe('ListNotesInputSchema', () => {
  it('accepts an empty filter', () => {
    expect(ListNotesInputSchema.parse({})).toEqual({})
  })

  it('caps the page size', () => {
    expect(ListNotesInputSchema.safeParse({ limit: MAX_PAGE_SIZE }).success).toBe(true)
    expect(ListNotesInputSchema.safeParse({ limit: MAX_PAGE_SIZE + 1 }).success).toBe(false)
  })

  it('rejects a non-positive or fractional page size', () => {
    expect(ListNotesInputSchema.safeParse({ limit: 0 }).success).toBe(false)
    expect(ListNotesInputSchema.safeParse({ limit: 2.5 }).success).toBe(false)
  })

  it('rejects an empty cursor, which would otherwise read as "start again"', () => {
    expect(ListNotesInputSchema.safeParse({ cursor: '' }).success).toBe(false)
  })
})
