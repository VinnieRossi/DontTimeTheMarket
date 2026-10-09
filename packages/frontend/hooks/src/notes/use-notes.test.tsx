import { makeFakeApi, makeNote, queryKeys } from '@dttm/queries'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTestQueryClient, createWrapper } from '../test-support'
import { useCreateNote } from './use-create-note'
import { useNote } from './use-note'
import { useNotes } from './use-notes'

describe('useNotes', () => {
  it('reports loading first, then the page it was given', async () => {
    const api = makeFakeApi({
      list: () => Promise.resolve({ notes: [makeNote({ title: 'First' })], nextCursor: null }),
    })
    const { result } = renderHook(() => useNotes(), { wrapper: createWrapper(api) })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.notes[0]?.title).toBe('First')
    expect(result.current.error).toBe(null)
  })

  it('passes the filter through to the request', async () => {
    const list = vi.fn(() => Promise.resolve({ notes: [], nextCursor: null }))
    const { result } = renderHook(() => useNotes({ status: 'published' }), {
      wrapper: createWrapper(makeFakeApi({ list })),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(list).toHaveBeenCalledWith({ status: 'published' })
  })

  it('surfaces a failure instead of leaving the caller loading forever', async () => {
    const api = makeFakeApi({ list: () => Promise.reject(new Error('the server refused')) })
    const { result } = renderHook(() => useNotes(), { wrapper: createWrapper(api) })

    await waitFor(() => expect(result.current.error).not.toBe(null))
    expect(result.current.error?.message).toBe('the server refused')
    expect(result.current.data).toBeUndefined()
  })

  it('caches by filter, so two filters do not overwrite each other', async () => {
    const list = vi.fn(() => Promise.resolve({ notes: [], nextCursor: null }))
    const api = makeFakeApi({ list })
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(api, queryClient)

    const drafts = renderHook(() => useNotes({ status: 'draft' }), { wrapper })
    await waitFor(() => expect(drafts.result.current.isLoading).toBe(false))
    const published = renderHook(() => useNotes({ status: 'published' }), { wrapper })
    await waitFor(() => expect(published.result.current.isLoading).toBe(false))

    expect(list).toHaveBeenCalledTimes(2)
    expect(queryClient.getQueryData(queryKeys.notes.list({ status: 'draft' }))).toBeDefined()
    expect(queryClient.getQueryData(queryKeys.notes.list({ status: 'published' }))).toBeDefined()
  })
})

describe('useNote', () => {
  it('fetches the note it was given an id for', async () => {
    const getById = vi.fn(() => Promise.resolve(makeNote({ id: 'note_7' })))
    const { result } = renderHook(() => useNote('note_7'), {
      wrapper: createWrapper(makeFakeApi({ getById })),
    })

    await waitFor(() => expect(result.current.data?.id).toBe('note_7'))
    expect(getById).toHaveBeenCalledWith({ id: 'note_7' })
  })

  it('asks for nothing while there is no id, so a page can mount before it has one', async () => {
    const getById = vi.fn(() => Promise.resolve(makeNote()))
    const { result } = renderHook(() => useNote(undefined), {
      wrapper: createWrapper(makeFakeApi({ getById })),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(getById).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('surfaces a failure', async () => {
    const api = makeFakeApi({ getById: () => Promise.reject(new Error('not found')) })
    const { result } = renderHook(() => useNote('note_missing'), { wrapper: createWrapper(api) })

    await waitFor(() => expect(result.current.error?.message).toBe('not found'))
  })
})

describe('useCreateNote', () => {
  it('reports the created note when the request succeeds', async () => {
    const create = vi.fn(() => Promise.resolve(makeNote({ title: 'New' })))
    const { result } = renderHook(() => useCreateNote(), {
      wrapper: createWrapper(makeFakeApi({ create })),
    })

    result.current.create({ title: 'New', body: 'b' })

    await waitFor(() => expect(result.current.created?.title).toBe('New'))
    expect(create).toHaveBeenCalledWith({ title: 'New', body: 'b' })
  })

  it('refetches the note lists afterward, so the new row appears without a reload', async () => {
    const list = vi.fn(() => Promise.resolve({ notes: [], nextCursor: null }))
    const api = makeFakeApi({ list, create: () => Promise.resolve(makeNote()) })
    const queryClient = createTestQueryClient()
    const wrapper = createWrapper(api, queryClient)

    const notes = renderHook(() => useNotes(), { wrapper })
    await waitFor(() => expect(notes.result.current.isLoading).toBe(false))
    expect(list).toHaveBeenCalledTimes(1)

    const creating = renderHook(() => useCreateNote(), { wrapper })
    creating.result.current.create({ title: 'New', body: 'b' })

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it('calls back only when the server accepted the note, so a form clears at the right moment', async () => {
    const onCreated = vi.fn()
    const { result } = renderHook(() => useCreateNote(), {
      wrapper: createWrapper(makeFakeApi({ create: () => Promise.resolve(makeNote()) })),
    })

    result.current.create({ title: 'New', body: 'b' }, onCreated)

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
  })

  it('does not call back when the creation was refused, so nothing typed is thrown away', async () => {
    const onCreated = vi.fn()
    const api = makeFakeApi({ create: () => Promise.reject(new Error('already exists')) })
    const { result } = renderHook(() => useCreateNote(), { wrapper: createWrapper(api) })

    result.current.create({ title: 'Same', body: 'b' }, onCreated)

    await waitFor(() => expect(result.current.error).not.toBe(null))
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('surfaces a rejected creation rather than reporting success', async () => {
    const api = makeFakeApi({
      create: () => Promise.reject(new Error('A note with that title already exists')),
    })
    const { result } = renderHook(() => useCreateNote(), { wrapper: createWrapper(api) })

    result.current.create({ title: 'Same', body: 'b' })

    await waitFor(() =>
      expect(result.current.error?.message).toBe('A note with that title already exists')
    )
    expect(result.current.created).toBeUndefined()
  })
})
