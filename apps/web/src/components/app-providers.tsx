'use client'

import { ApiProvider } from '@dttm/hooks'
import { createApiClient } from '@dttm/queries'
import type { ReactNode } from 'react'
import { useState } from 'react'

/**
 * The client boundary. The API client is created once per browser session and handed to the tree,
 * so no hook reaches for a module-level client and a test can supply a different one.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // No base URL: the client resolves the browser's own origin, which keeps every call
  // same-origin without the app having to know its own address.
  const [api] = useState(() => createApiClient())
  return <ApiProvider api={api}>{children}</ApiProvider>
}
