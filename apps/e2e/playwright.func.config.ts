import { defineConfig } from '@playwright/test'
import { APP_BASE_URL, ROOT_DIR } from './functional-env'

/**
 * The functional suite: real flows through the game, driven over the UI only, against a
 * `next dev` server. Unlike the destructive, CI-only functional suite this is patterned on, this
 * one resets nothing shared and needs no Docker, so it is safe to run on a laptop, in the gate,
 * and in CI alike.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.func.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env['CI'] ? 'github' : 'list',
  expect: {
    timeout: 15_000,
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
  },
})
