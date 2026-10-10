import { expect, test } from '@playwright/test'

/**
 * The core loop, driven the way a player drives it: open a run, stop the clock, buy, watch the
 * order fill on the next day, let the market run until a score is allowed, cash out, and start
 * again. Black box over the UI only, with no reach into the engine, so what it proves is what
 * somebody playing the game can actually observe.
 */
test('a run can be opened, traded, scored, and started again', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Short - 1 year' }).click()
  await page.getByRole('button', { name: 'Start run' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()

  const day = page.getByText(/^Day \d+ \/ 252$/)
  await expect(day, 'the run should open on the length that was chosen').toBeVisible()
  await expect(page.getByText('0.00 sh ($0)')).toBeVisible()

  await page.getByRole('button', { name: 'Trade' }).click()
  await page.getByRole('button', { name: '50%' }).click()
  await page.getByRole('button', { name: 'Place buy order' }).click()

  await expect(
    page.getByText('0.00 sh ($0)'),
    'a market order fills on the next day, never at the price that was on screen'
  ).toBeVisible()

  await page.getByRole('button', { name: 'Step' }).click()
  await expect(
    page.getByText('0.00 sh ($0)'),
    'stepping a day should fill the order and leave a position behind'
  ).toHaveCount(0)

  const cashOut = page.getByRole('button', { name: /^Cash out/ })
  await expect(cashOut, 'a run too short to score cannot be cashed out').toBeDisabled()

  await page.getByRole('button', { name: '16x' }).click()
  await expect(cashOut).toBeEnabled({ timeout: 30_000 })
  await cashOut.click()

  await expect(page.getByText(/^[+-]\d+ bps$/), 'the run should end with a score').toBeVisible()
  await expect(page.getByRole('heading', { name: /Bogle NPC/ })).toBeVisible()

  /*
   * Index, S&P 500, Berkshire, and Nasdaq-100 NPCs each only appear in a run whose randomly drawn
   * start day their own baked history covers, so a single run can show anywhere from none of them
   * to all three. Rather than pin the test to one seed's outcome, this asserts the one invariant
   * that holds regardless: whichever of the three appear are rendered with a real dollar value,
   * never left as a blank or broken row.
   */
  for (const name of ['S&P 500 NPC', 'Nasdaq-100 NPC', 'Berkshire NPC']) {
    const label = page.getByText(name, { exact: true })
    if (await label.isVisible()) {
      const tile = page.locator('.app-tile', { has: label })
      await expect(tile.getByText(/^\$[\d,]+(\.\d{2})?$/)).toBeVisible()
    }
  }

  await page.getByRole('button', { name: 'Play a new run' }).click()
  await expect(page.getByRole('heading', { name: 'Think you can beat the market?' })).toBeVisible()
})
