import { makeFakeApi, makeNote } from '@dttm/queries'
import { ValidationError } from '@dttm/types'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useNotes } from './notes/use-notes'
import { ApiProvider, useApi } from './provider'
import { createWrapper } from './test-support'

describe('useApi', () => {
  it('hands back the client the provider was given', () => {
    const api = makeFakeApi()
    const { result } = renderHook(() => useApi(), { wrapper: createWrapper(api) })
    expect(result.current).toBe(api)
  })

  it('fails loudly outside a provider, naming the cause', () => {
    expect(() => renderHook(() => useApi())).toThrow(ValidationError)
    expect(() => renderHook(() => useApi())).toThrow(/ApiProvider/)
  })
})

describe('ApiProvider', () => {
  it('creates its own cache when none is supplied, so an app can mount it with one prop', async () => {
    const api = makeFakeApi({
      list: () => Promise.resolve({ notes: [makeNote({ title: 'First' })], nextCursor: null }),
    })
    function Wrapper({ children }: { children: ReactNode }) {
      return <ApiProvider api={api}>{children}</ApiProvider>
    }

    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.data?.notes[0]?.title).toBe('First'))
  })
})
