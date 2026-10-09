import type { NoteView } from '../domain/note-view'
import { NoteCard } from '../molecules/NoteCard'

export interface NoteListProps {
  notes: readonly NoteView[]
  /** Shown while the first page is loading, so the reader sees progress rather than emptiness. */
  isLoading?: boolean
  /** Shown when loading failed. The caller decides the wording, since it knows what failed. */
  error?: string | undefined
  /** What to say when there is genuinely nothing, which is not the same as not knowing yet. */
  emptyMessage?: string
  onOpen?: ((id: string) => void) | undefined
}

/**
 * A list of notes, with the three states a list actually has: waiting, failed, and empty. Each one
 * is rendered rather than left to the caller, because a list that only renders its happy path
 * pushes the other two into whichever page mounted it, and they get handled differently each time.
 */
export function NoteList({
  notes,
  isLoading = false,
  error,
  emptyMessage = 'No notes yet.',
  onOpen,
}: NoteListProps) {
  if (isLoading) {
    return (
      <p className="app-empty" role="status">
        Loading notes
      </p>
    )
  }

  if (error !== undefined) {
    return (
      <p className="app-empty" role="alert">
        {error}
      </p>
    )
  }

  if (notes.length === 0) {
    return <p className="app-empty">{emptyMessage}</p>
  }

  return (
    <ul className="app-note-list">
      {notes.map((note) => (
        <li key={note.id}>
          <NoteCard note={note} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  )
}
