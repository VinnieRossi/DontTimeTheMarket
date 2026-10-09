import type { Tone } from '@dttm/theme'

/**
 * What a component needs in order to render a note, and nothing else. It is not the stored row:
 * the caller decides which tone a status carries and what is worth showing, so this package holds
 * no domain rule and cannot drift from one.
 */
export interface NoteView {
  id: string
  title: string
  body: string
  /** The status as the reader should see it. */
  status: string
  /** Which tone that status carries. The caller decides; the theme decides what it looks like. */
  statusTone: Tone
  savedAt: Date
}
