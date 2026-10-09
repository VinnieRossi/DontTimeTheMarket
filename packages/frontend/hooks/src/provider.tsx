import type { ApiClient } from '@dttm/queries'
import { ValidationError } from '@dttm/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useMemo } from 'react'

/**
 * The client and the cache are supplied to the tree rather than imported by the hooks. A hook that
 * reached for a module-level client would be a hook no test could point somewhere else, and a
 * server-rendered page could not give it a different base URL.
 */
interface ApiContextValue {
  api: ApiClient
}

const ApiContext = createContext<ApiContextValue | null>(null)

export interface ApiProviderProps {
  api: ApiClient
  /** Override the cache. One is created when omitted, with retries off. */
  queryClient?: QueryClient
  children: ReactNode
}

function createDefaultQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

export function ApiProvider({ api, queryClient, children }: ApiProviderProps) {
  const client = useMemo(() => queryClient ?? createDefaultQueryClient(), [queryClient])
  const value = useMemo<ApiContextValue>(() => ({ api }), [api])
  return (
    <QueryClientProvider client={client}>
      <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  )
}

/**
 * The injected client. Throws when called outside a provider, so a tree wired wrongly fails at
 * once with a message that names the cause rather than dereferencing null three frames later.
 */
export function useApi(): ApiClient {
  const value = useContext(ApiContext)
  if (value === null) {
    throw new ValidationError('useApi was called outside an ApiProvider')
  }
  return value.api
}
