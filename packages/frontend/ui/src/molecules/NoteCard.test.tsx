import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NoteView } from '../domain/note-view'
import { NoteCard } from './NoteCard'

const note: NoteView = {
  id: 'note_1',
  title: 'Rewrite the onboarding copy',
  body: 'The second paragraph repeats the first.',
  status: 'draft',
  statusTone: 'neutral',
  savedAt: new Date('2026-04-01T12:00:00.000Z'),
}

describe('NoteCard', () => {
  it('shows the title, the status, and when it was saved', () => {
    render(<NoteCard note={note} />)

    expect(screen.getByRole('heading', { name: note.title })).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('Saved 2026-04-01')).toBeInTheDocument()
  })

  it('names itself by its title, so a reader on a screen reader can tell cards apart', () => {
    render(<NoteCard note={note} />)
    expect(screen.getByRole('article', { name: note.title })).toBeInTheDocument()
  })

  it('shortens a long body rather than letting a card grow without limit', () => {
    render(<NoteCard note={{ ...note, body: 'word '.repeat(80) }} />)
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument()
  })

  it('shows no control when there is nothing to do with the card', () => {
    render(<NoteCard note={note} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('reports which note the reader asked to open', async () => {
    const onOpen = vi.fn()
    render(<NoteCard note={note} onOpen={onOpen} />)

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(onOpen).toHaveBeenCalledWith('note_1')
  })
})
