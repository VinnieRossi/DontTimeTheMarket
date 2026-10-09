import { expect, test } from '@playwright/test'

interface DrainResponse {
  data: {
    summary: {
      claimed: number
      completed: number
      retried: number
      dead: number
    }
  }
}

/**
 * The one functional flow: create a note through the real UI, confirm it persists in the database
 * rather than only in client state, then drain the durable queue and confirm the `note_created`
 * job it enqueued actually completed. Black box over HTTP and UI only, the same shape as the
 * suite this one is patterned on, with the one deliberate difference: the database behind it is a
 * throwaway directory this suite owns (see `functional-global-setup.config.ts`), not a shared
 * Postgres, so there is nothing destructive to reset and no Docker to start.
 */
test('creating a note saves it, survives a reload, and its follow-up job completes', async ({
  page,
}) => {
  const title = `Functional e2e note ${Date.now()}`
  const body = 'Written by the functional suite so a real save can be checked end to end.'

  await page.goto('/')

  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Body').fill(body)
  await page.getByRole('button', { name: 'Save note' }).click()

  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('heading', { name: title }),
    'a reload should read the note back from the database rather than from client state'
  ).toBeVisible()

  const drain = await page.request.post('/api/jobs/drain')
  expect(drain.ok(), 'the drain endpoint should accept the request').toBe(true)

  const result = (await drain.json()) as DrainResponse
  expect(result.data.summary.dead, 'the note_created job should not dead-letter').toBe(0)
  expect(result.data.summary.completed, 'the note_created job should complete').toBeGreaterThan(0)
})
