import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The functional suite's own throwaway target: a dedicated port so it never collides with a
 * developer's own `pnpm dev`, and a fresh database directory so a run never inherits rows a
 * previous run left behind. `next dev` rather than a production build, because a production
 * boot (`NODE_ENV=production`) refuses to start at all: `resolveSessionReader` in
 * `apps/web/src/server/session.ts` only ships a fixed session for local and mock use, by design.
 */
export const APP_BASE_URL = 'http://localhost:3101'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
export const ROOT_DIR = resolve(E2E_DIR, '..', '..')
export const FUNCTIONAL_DATABASE_DIR = resolve(ROOT_DIR, 'apps', 'e2e', '.storage', 'functional-db')

/**
 * `next dev` sets `NODE_ENV=development` itself regardless of what a parent process passes, so
 * it is left out here rather than asserted to a value the app would silently override.
 */
export const FUNCTIONAL_ENV = {
  PROVIDER_MODE: 'mock',
  APP_URL: APP_BASE_URL,
  DATABASE_DIR: FUNCTIONAL_DATABASE_DIR,
  LOG_LEVEL: 'error',
} satisfies Record<string, string>
