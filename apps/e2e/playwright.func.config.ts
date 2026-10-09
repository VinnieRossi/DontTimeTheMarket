import { defineConfig } from '@playwright/test'
import { APP_BASE_URL, FUNCTIONAL_ENV, ROOT_DIR } from './functional-env'

/**
 * The functional suite: one real flow through the notes example, driven over HTTP and UI only,
 * against a `next dev` server and a throwaway in-process database. Unlike the destructive,
 * CI-only functional suite this is patterned on, this one resets nothing shared and needs no
 * Docker, so it is safe to run on a laptop, in the gate, and in CI alike.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.func.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  globalSetup: './functional-global-setup.config.ts',
  reporter: process.env['CI'] ? 'github' : 'list',
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: APP_BASE_URL,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @dttm/web exec next dev -p 3101',
    url: APP_BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    cwd: ROOT_DIR,
    env: FUNCTIONAL_ENV,
  },
})
