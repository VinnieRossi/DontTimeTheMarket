import type { ApiClient } from '@dttm/queries'
import { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiProvider } from './provider'

/**
 * What a hook test needs to mount a hook: the fake client and a cache with retries off, so a
 * rejection resolves on the first attempt rather than after a retry schedule the test then has to
 * wait out.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function createWrapper(api: ApiClient, queryClient = createTestQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ApiProvider api={api} queryClient={queryClient}>
        {children}
      </ApiProvider>
    )
  }
}
