import { formatIsoDate, truncate } from '@dttm/utils'
import { StatusBadge } from '../atoms/StatusBadge'
import type { NoteView } from '../domain/note-view'
import { cn } from '../lib/cn'

/** How much of a body a card shows before it trails off. */
const PREVIEW_LENGTH = 160

export interface NoteCardProps {
  note: NoteView
  className?: string | undefined
  /** Rendered when given, so a card in a read-only list carries no controls at all. */
  onOpen?: ((id: string) => void) | undefined
}

/**
 * One note, summarized. It receives the note and reports that someone wants to open it; it does
 * not fetch, and it does not know what opening one does.
 */
export function NoteCard({ note, className, onOpen }: NoteCardProps) {
  return (
    <article className={cn('app-note-card', className)} aria-labelledby={`note-title-${note.id}`}>
      <header className="app-note-card__header">
        <h3 className="app-note-card__title" id={`note-title-${note.id}`}>
          {note.title}
        </h3>
        <StatusBadge tone={note.statusTone}>{note.status}</StatusBadge>
      </header>
      <p className="app-note-card__body">{truncate(note.body, PREVIEW_LENGTH)}</p>
      <footer className="app-row">
        <span className="app-note-card__meta">Saved {formatIsoDate(note.savedAt)}</span>
        {onOpen !== undefined && (
          <button
            type="button"
            className="app-button app-button--ghost app-button--sm app-focusable"
            onClick={() => onOpen(note.id)}
          >
            Open
          </button>
        )}
      </footer>
    </article>
  )
}
