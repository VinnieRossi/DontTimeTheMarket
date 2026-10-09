import { defineConfig } from 'vitest/config'

/**
 * The app's tests exercise the transport as a black box: a request goes in, a response comes out,
 * and the assertions are about what a client would receive. No coverage threshold is set here,
 * because this package holds wiring and the behavior behind it is covered where it lives.
 *
 * The database is a throwaway directory per run, created in the global setup, so `pnpm test` works
 * on a fresh clone, never writes into the database a developer is using, and never inherits what
 * the last run left behind.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globalSetup: ['./vitest.global-setup.ts'],
    env: {
      PROVIDER_MODE: 'mock',
      LOG_LEVEL: 'error',
    },
  },
})
