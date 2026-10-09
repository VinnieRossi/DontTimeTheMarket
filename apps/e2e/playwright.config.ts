import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(E2E_DIR, '..', '..')

/** A dedicated port per target, so a visual run never collides with `pnpm dev`. */
const APP_BASE_URL = 'http://localhost:3102'
const STORYBOOK_BASE_URL = 'http://localhost:6101'

/**
 * Visual regression against the running app and the built Storybook, at both widths the game is
 * played at: a desktop window and a 390 pixel phone, which is the narrowest layout the design
 * targets.
 *
 * Baselines are deterministic because both targets render from a fixed source: the app's opening
 * screen holds no run yet, and every story renders from its own args rather than from anything
 * generated. The running game is covered by its stories rather than by an app screenshot, because
 * a run opens on a seeded random slice of history and advances on a timer, so no two app-level
 * screenshots of it would agree.
 *
 * Not part of `pnpm verify`, because a screenshot diff is platform-specific; it runs as its own
 * dedicated CI job instead. See `apps/e2e/AGENTS.md` for how a diff there gets resolved.
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
      command: 'pnpm --filter @dttm/web exec next dev -p 3102',
      url: APP_BASE_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      cwd: ROOT_DIR,
    },
  ],
  /*
   * Both widths run on the same Chromium the functional suite installs: a second engine would be
   * a second set of baselines to keep, and what is being checked here is the layout at a phone
   * width rather than one vendor's rendering of it.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
})
