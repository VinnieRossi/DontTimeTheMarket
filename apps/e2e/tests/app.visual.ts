import { expect, test } from '@playwright/test'

/** The running app (`next dev`). Override with APP_BASE_URL to point at another target. */
const APP = process.env['APP_BASE_URL'] ?? 'http://localhost:3102'

/**
 * The screens the app renders from nothing but its own code. The opening screen is the only one
 * of those: a run picks a random slice of history and then advances on a timer, so a screenshot
 * of a game in progress would differ on every take. The game, the scoreboard and the sheets are
 * covered instead by their stories, which render from fixed props at both of these widths.
 */
const SCREENS: ReadonlyArray<readonly [string, string]> = [['start', '/']]

for (const [name, path] of SCREENS) {
  test(`app: ${name} renders`, async ({ page }) => {
    await page.goto(`${APP}${path}`, { waitUntil: 'networkidle' })
    await expect(page).toHaveScreenshot(`app-${name}.png`, { fullPage: true })
  })
}
