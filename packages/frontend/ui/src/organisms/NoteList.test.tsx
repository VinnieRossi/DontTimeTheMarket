import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NoteView } from '../domain/note-view'
import { NoteList } from './NoteList'

const notes: NoteView[] = [
  {
    id: 'note_1',
    title: 'First note',
    body: 'b',
    status: 'draft',
    statusTone: 'neutral',
    savedAt: new Date('2026-04-01T12:00:00.000Z'),
  },
  {
    id: 'note_2',
    title: 'Second note',
    body: 'b',
    status: 'published',
    statusTone: 'success',
    savedAt: new Date('2026-03-28T09:30:00.000Z'),
  },
]

describe('NoteList', () => {
  it('renders one card per note, in the order it was given', () => {
    render(<NoteList notes={notes} />)

    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(headings).toEqual(['First note', 'Second note'])
  })

  it('announces that it is loading, rather than looking empty', () => {
    render(<NoteList notes={[]} isLoading />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading notes')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('announces a failure as an alert, so it is not missed', () => {
    render(<NoteList notes={[]} error="Could not load notes." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load notes.')
  })

  it('prefers loading over empty, since not knowing yet is not the same as nothing', () => {
    render(<NoteList notes={[]} isLoading emptyMessage="No notes yet." />)
    expect(screen.queryByText('No notes yet.')).not.toBeInTheDocument()
  })

  it('prefers a failure over empty, so a broken load never reads as an empty list', () => {
    render(<NoteList notes={[]} error="Could not load notes." emptyMessage="No notes yet." />)
    expect(screen.queryByText('No notes yet.')).not.toBeInTheDocument()
  })

  it('says so when there is genuinely nothing', () => {
    render(<NoteList notes={[]} />)
    expect(screen.getByText('No notes yet.')).toBeInTheDocument()
  })

  it('lets the caller word the empty state', () => {
    render(<NoteList notes={[]} emptyMessage="Nothing in this filter." />)
    expect(screen.getByText('Nothing in this filter.')).toBeInTheDocument()
  })

  it('passes the open callback through to each card', async () => {
    const onOpen = vi.fn()
    render(<NoteList notes={notes} onOpen={onOpen} />)

    const [first] = screen.getAllByRole('button', { name: 'Open' })
    if (first === undefined) throw new Error('expected an open control')
    await userEvent.click(first)
    expect(onOpen).toHaveBeenCalledWith('note_1')
  })
})
