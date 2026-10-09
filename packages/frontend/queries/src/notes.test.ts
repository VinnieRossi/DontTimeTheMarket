import { describe, expect, it, vi } from 'vitest'
import { createNote, fetchNote, fetchNotes, updateNote } from './notes'
import { makeFakeApi, makeNote } from './test-support'

describe('note queries', () => {
  it('asks for a list with the filter it was given', async () => {
    const list = vi.fn(() => Promise.resolve({ notes: [makeNote()], nextCursor: null }))
    const api = makeFakeApi({ list })

    const result = await fetchNotes(api, { status: 'published', limit: 5 })

    expect(list).toHaveBeenCalledWith({ status: 'published', limit: 5 })
    expect(result.notes).toHaveLength(1)
  })

  it('asks for an empty list when given no filter, rather than inventing one', async () => {
    const list = vi.fn(() => Promise.resolve({ notes: [], nextCursor: null }))
    await fetchNotes(makeFakeApi({ list }))
    expect(list).toHaveBeenCalledWith({})
  })

  it('addresses a single note by id', async () => {
    const getById = vi.fn(() => Promise.resolve(makeNote({ id: 'note_7' })))
    const note = await fetchNote(makeFakeApi({ getById }), 'note_7')

    expect(getById).toHaveBeenCalledWith({ id: 'note_7' })
    expect(note.id).toBe('note_7')
  })

  it('passes a creation straight through, without reshaping it', async () => {
    const create = vi.fn(() => Promise.resolve(makeNote({ title: 'New' })))
    const note = await createNote(makeFakeApi({ create }), { title: 'New', body: 'b' })

    expect(create).toHaveBeenCalledWith({ title: 'New', body: 'b' })
    expect(note.title).toBe('New')
  })

  it('passes an update straight through', async () => {
    const update = vi.fn(() => Promise.resolve(makeNote({ status: 'published' })))
    const note = await updateNote(makeFakeApi({ update }), { id: 'note_1', status: 'published' })

    expect(update).toHaveBeenCalledWith({ id: 'note_1', status: 'published' })
    expect(note.status).toBe('published')
  })

  it('lets a failure reach the caller rather than swallowing it', async () => {
    const api = makeFakeApi({ getById: () => Promise.reject(new Error('not found')) })
    await expect(fetchNote(api, 'note_missing')).rejects.toThrow('not found')
  })
})
