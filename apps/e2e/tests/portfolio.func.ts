import { expect, type Locator, type Page, test } from '@playwright/test'

/**
 * The portfolio loop, driven the way a player drives it: build a basket of disguised companies,
 * start the run, trim a position, open a new one, put the weights back, score it, and find out
 * who the companies actually were.
 *
 * Black box over the UI only, with no reach into the engine, so what it proves is what somebody
 * playing the game can actually observe. The companies are disguised under a seed drawn when the
 * builder opens, so no name or ticker on this screen is the same twice: everything below is
 * matched on what a card says about itself rather than on which company it happens to be.
 */

/** Every company card ends its label with the volatility tag, which is what identifies one. */
function companyCards(page: Page): Locator {
  return page.getByRole('button', { name: /volatility$/ })
}

/** Every holding row reports its weight against its target, which is what identifies one. */
function holdingRows(page: Page): Locator {
  return page.getByRole('button', { name: /now, \d+% target/ })
}

/** How far the worst-drifted holding sits from its target, in points, as the screen reports it. */
async function worstDrift(page: Page): Promise<number> {
  const drifts = await page.locator('.app-holding__drift').allTextContents()
  return Math.max(...drifts.map((text) => Math.abs(Number.parseFloat(text))))
}

async function fillAndStep(page: Page, action: string): Promise<void> {
  await page.getByRole('button', { name: action, exact: true }).click()
  await page.getByRole('button', { name: 'Step' }).click()
}

test('a portfolio can be built, traded, rebalanced, scored, and revealed', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Build a stock portfolio instead' }).click()

  await expect(
    page.getByRole('heading', { name: 'Build your portfolio' }),
    'the roster loads on demand, so the builder arrives after its chunk does'
  ).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'Pick at least one company' }),
    'there is nothing to start until a company is picked'
  ).toBeDisabled()

  const cards = companyCards(page)
  await cards.nth(0).click()
  await cards.nth(1).click()
  await cards.nth(2).click()

  await expect(
    page.getByText(/^Total: 100%/),
    'picking companies splits the money between them, so the total is never left broken'
  ).toBeVisible()

  await page.getByRole('button', { name: 'Split evenly' }).click()
  await expect(page.getByText(/^Total: 100%/)).toBeVisible()

  await page.getByRole('button', { name: 'Short - 1 year' }).click()
  await page.getByRole('button', { name: 'Start run with this portfolio' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()

  await expect(page.getByText(/^Day \d+ \/ 252$/)).toBeVisible()
  await expect(holdingRows(page), 'the run opens holding what was picked').toHaveCount(3)
  await expect(
    page.getByText('$0').first(),
    'a portfolio run invests the whole stake on day one, so nothing is left in cash'
  ).toBeVisible()

  // Trim one position by half, which fills on the following day like any other market order.
  await holdingRows(page).first().click()
  await page.getByRole('button', { name: 'Sell', exact: true }).click()
  await expect(
    page.getByLabel('Order type'),
    'a holding takes market orders only, so there is no order type to choose'
  ).toHaveCount(0)
  await page.getByRole('button', { name: '50%' }).click()
  await fillAndStep(page, 'Place sell order')

  await expect(holdingRows(page), 'a part sale leaves the position open').toHaveCount(3)
  const cash = page.locator('.app-tile').filter({ hasText: 'Cash' })
  await expect(cash, 'the proceeds land in cash').not.toHaveText(/\$0$/)

  // Open a position in a company the portfolio does not hold.
  await page.getByRole('button', { name: 'Buy a company' }).click()
  const heldTickers = await page.locator('.app-holding__ticker').allTextContents()
  const fresh = page
    .locator('.app-sheet__panel')
    .getByRole('button', { name: /volatility$/ })
    .filter({ hasNotText: new RegExp(heldTickers.join('|')) })
    .first()
  await fresh.click()
  await page.getByRole('button', { name: '100%' }).click()
  await fillAndStep(page, 'Place buy order')

  await expect(holdingRows(page), 'buying a new company opens a fourth position').toHaveCount(4)

  // Put every holding back toward the share of the portfolio it is meant to be.
  const rebalance = page.getByRole('button', { name: 'Rebalance', exact: true })
  await expect(rebalance, 'a portfolio that has drifted can be put back').toBeEnabled()
  const driftBefore = await worstDrift(page)
  expect(
    driftBefore,
    'opening a new position leaves the weights well off their targets'
  ).toBeGreaterThan(2)

  await rebalance.click()
  await page.getByRole('button', { name: 'Step' }).click()
  /*
   * Toward, rather than exactly onto: the orders fill at the next day's prices and pay tax on
   * what they sell, so a rebalanced portfolio still sits a little off. What has to be true is
   * that it is much closer than it was.
   */
  expect(await worstDrift(page)).toBeLessThan(driftBefore / 2)

  const cashOut = page.getByRole('button', { name: /^Cash out/ })
  await expect(cashOut, 'a run too short to score cannot be cashed out').toBeDisabled()

  await page.getByRole('button', { name: '16x' }).click()
  await expect(cashOut).toBeEnabled({ timeout: 30_000 })
  await cashOut.click()

  await expect(page.getByText(/^[+-]\d+ bps$/), 'the run should end with a score').toBeVisible()
  await expect(page.getByRole('heading', { name: 'Who you were actually holding' })).toBeVisible()
  await expect(
    page.locator('.app-reveal__row'),
    'every company that was held or traded is named at the end'
  ).toHaveCount(4)

  await page.getByRole('button', { name: 'Play a new run' }).click()
  await expect(page.getByRole('heading', { name: 'Think you can beat the market?' })).toBeVisible()
})
