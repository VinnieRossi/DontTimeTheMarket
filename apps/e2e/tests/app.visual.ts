import { expect, test } from '@playwright/test'

/** The running app (`next dev`). Override with APP_BASE_URL to point at another target. */
const APP = process.env['APP_BASE_URL'] ?? 'http://localhost:3102'

/**
 * The example feature's only screen, against a freshly reset database (see `playwright.config.ts`),
 * so it always renders its empty state rather than whatever a previous run happened to leave
 * behind.
 */
const SCREENS: ReadonlyArray<readonly [string, string]> = [['notes', '/']]

for (const [name, path] of SCREENS) {
  test(`app: ${name} renders`, async ({ page }) => {
    await page.goto(`${APP}${path}`, { waitUntil: 'networkidle' })
    await expect(page).toHaveScreenshot(`app-${name}.png`, { fullPage: true })
  })
}
