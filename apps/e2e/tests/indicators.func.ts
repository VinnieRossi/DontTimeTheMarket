import { expect, test } from '@playwright/test'

/**
 * The other thing a player does: pile readouts onto the screen looking for an edge. The flow
 * proves the whole path from the sheet to the chart, including the one joke the feature carries,
 * which is the label that reports how cluttered the screen has become.
 */
test('readouts can be piled onto the chart, and the screen says how bad it has got', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start run' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()

  await page.getByRole('button', { name: '+ Data' }).click()
  await expect(page.getByText('Clean'), 'nothing is switched on yet').toBeVisible()

  await page.getByRole('checkbox', { name: 'RSI (14)' }).check()
  await page.getByRole('checkbox', { name: 'MACD' }).check()
  await page.getByRole('checkbox', { name: 'Volume' }).check()
  await expect(
    page.getByText('Busy'),
    'three readouts with a figure to report should read as busy'
  ).toBeVisible()

  // A moving average draws on the chart instead of reporting a figure, so it adds no readout.
  await page.getByRole('checkbox', { name: 'Moving averages (20/50)' }).check()
  await expect(page.getByText('Busy')).toBeVisible()

  await page.getByRole('button', { name: 'Close' }).click()

  await expect(page.getByText('RSI (14)')).toBeVisible()
  await expect(page.getByText('MACD')).toBeVisible()
  await expect(page.getByText('Volume (illustrative)')).toBeVisible()
  await expect(
    page.getByText('SMA 20'),
    'a moving average draws on the chart, so the key has to name it'
  ).toBeVisible()
})
