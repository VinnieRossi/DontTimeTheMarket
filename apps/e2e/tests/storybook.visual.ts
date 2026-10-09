import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/** The built Storybook served statically. Override with STORYBOOK_BASE_URL. */
const SB = process.env['STORYBOOK_BASE_URL'] ?? 'http://localhost:6101'

interface StoryIndexEntry {
  type: string
  id: string
  title: string
  name: string
}

interface StoryIndex {
  entries: Record<string, StoryIndexEntry>
}

const TESTS_DIR = dirname(fileURLToPath(import.meta.url))
const STORYBOOK_STATIC_INDEX = resolve(
  TESTS_DIR,
  '..',
  '..',
  '..',
  'packages',
  'frontend',
  'ui',
  'storybook-static',
  'index.json'
)

/**
 * Every story in the built index, not a hand-kept list: `test:visual` runs `storybook:build`
 * before Playwright starts, so this file reads the real index off disk rather than guessing which
 * stories exist. A new story gets a baseline the first time `test:visual:update` runs after it is
 * added, with nothing else to remember.
 */
function readStories(): StoryIndexEntry[] {
  const index = JSON.parse(readFileSync(STORYBOOK_STATIC_INDEX, 'utf8')) as StoryIndex
  return Object.values(index.entries).filter((entry) => entry.type === 'story')
}

for (const story of readStories()) {
  test(`story: ${story.title}/${story.name}`, async ({ page }) => {
    await page.goto(`${SB}/iframe.html?viewMode=story&id=${story.id}`, {
      waitUntil: 'networkidle',
    })
    await expect(page.locator('body')).toHaveScreenshot(`${story.id}.png`)
  })
}
