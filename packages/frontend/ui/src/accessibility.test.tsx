import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { Button } from './atoms/Button'
import { StatusBadge } from './atoms/StatusBadge'
import { TextField } from './atoms/TextField'
import type { NoteView } from './domain/note-view'
import { NoteCard } from './molecules/NoteCard'
import { NoteList } from './organisms/NoteList'
import { PageShell } from './templates/PageShell'

/**
 * Accessibility asserted by a test rather than reviewed by eye. An engine catches the mechanical
 * failures, which is most of them: an input with no label, a control with no name, a heading order
 * that skips a level. It does not catch whether the page makes sense, so it is a floor and not a
 * ceiling.
 *
 * Every exported component is here. A component added without a row in this table is a component
 * nobody checked.
 *
 * Color contrast is switched off here rather than silently passing: measuring it needs a real
 * renderer, and the test environment has none, so an engine run here would report nothing and look
 * like a pass. Contrast is checked instead where a real browser is doing the rendering, by the
 * accessibility addon that runs against every story.
 */
const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }
const note: NoteView = {
  id: 'note_1',
  title: 'Rewrite the onboarding copy',
  body: 'The second paragraph repeats the first.',
  status: 'draft',
  statusTone: 'neutral',
  savedAt: new Date('2026-04-01T12:00:00.000Z'),
}

const cases: readonly [string, ReactElement][] = [
  ['Button', <Button key="b">Save note</Button>],
  [
    'Button, disabled',
    <Button key="bd" disabled>
      Save note
    </Button>,
  ],
  [
    'Button, busy',
    <Button key="bb" busy>
      Saving
    </Button>,
  ],
  ['StatusBadge', <StatusBadge key="sb">draft</StatusBadge>],
  [
    'TextField',
    <TextField key="tf" id="title" label="Title" value="" onChange={() => undefined} />,
  ],
  [
    'TextField with an error',
    <TextField
      key="tfe"
      id="title"
      label="Title"
      value=""
      onChange={() => undefined}
      error="A title is required"
    />,
  ],
  ['NoteCard', <NoteCard key="nc" note={note} />],
  ['NoteCard with an action', <NoteCard key="nca" note={note} onOpen={() => undefined} />],
  ['NoteList', <NoteList key="nl" notes={[note]} />],
  ['NoteList, loading', <NoteList key="nll" notes={[]} isLoading />],
  ['NoteList, failed', <NoteList key="nlf" notes={[]} error="Could not load notes." />],
  ['NoteList, empty', <NoteList key="nle" notes={[]} />],
  [
    'PageShell',
    <PageShell key="ps" title="Notes" description="Everything written down so far.">
      <p>Content</p>
    </PageShell>,
  ],
]

describe('accessibility', () => {
  it.each(cases)('%s has no violations an engine can detect', async (_name, element) => {
    const { container } = render(element)
    const results = await axe(container, AXE_OPTIONS)
    expect(results.violations).toEqual([])
  })
})
