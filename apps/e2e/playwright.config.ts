import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(E2E_DIR, '..', '..')

/** A dedicated port and database per target, so a visual run never collides with `pnpm dev`. */
const APP_BASE_URL = 'http://localhost:3102'
const STORYBOOK_BASE_URL = 'http://localhost:6101'
const VISUAL_DATABASE_DIR = resolve(ROOT_DIR, 'apps', 'e2e', '.storage', 'visual-db')

/**
 * Visual regression against the running app and the built Storybook. Baselines are deterministic
 * because both targets render from a fixed source: the app opens an empty, freshly reset
 * database, and every story renders from its own args rather than from anything fetched. Not
 * part of `pnpm verify` because a screenshot diff is platform-specific; it runs as its own
 * dedicated CI job instead, the same way the suite this one is patterned on keeps it out of its
 * gate. See `apps/e2e/AGENTS.md` for how a diff there gets resolved.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.visual.ts',
  snapshotPathTemplate: 'visual-baselines/{projectName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: process.env['CI'] ? ([['github'], ['html', { open: 'never' }]] as const) : 'list',
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' },
  },
  use: { viewport: { width: 1280, height: 800 } },
  webServer: [
    {
      // `storybook:build` has already run by the time this starts: `test:visual` builds it before
      // invoking Playwright, so `storybook.visual.ts` can read the built story index off disk at
      // module load time, before Playwright's own test collection can be relied on to wait for a
      // webServer to be ready.
      command:
        'pnpm --filter @dttm/ui exec vite preview --outDir storybook-static --port 6101 --strictPort',
      url: STORYBOOK_BASE_URL,
      reuseExistingServer: false,
      timeout: 30_000,
      cwd: ROOT_DIR,
    },
    {
      command: [
        `rm -rf ${VISUAL_DATABASE_DIR}`,
        'pnpm --filter @dttm/web exec next dev -p 3102',
      ].join(' && '),
      url: APP_BASE_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      cwd: ROOT_DIR,
      env: {
        PROVIDER_MODE: 'mock',
        APP_URL: APP_BASE_URL,
        DATABASE_DIR: VISUAL_DATABASE_DIR,
        LOG_LEVEL: 'error',
      },
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
