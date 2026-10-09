import type { Note } from '@dttm/queries'
import type { Tone } from '@dttm/theme'
import type { NoteView } from '@dttm/ui'

/**
 * The mapping from what the API returns to what a component renders. It lives in the app because
 * that is the only layer allowed to know both sides: the presentation package holds no domain
 * knowledge, and the domain holds no opinion about color.
 */
const STATUS_TONES: Record<Note['status'], Tone> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
}

export function toNoteView(note: Note): NoteView {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    status: note.status,
    statusTone: STATUS_TONES[note.status],
    savedAt: note.updatedAt,
  }
}
