'use client'

import { useCreateNote, useNotes } from '@dttm/hooks'
import { Button, NoteList, PageShell, TextField } from '@dttm/ui'
import { useState } from 'react'
import { toNoteView } from '@/lib/note-view'

/**
 * The composition for the notes screen: it calls the hooks, maps what they return into what the
 * components take, and connects a callback to a mutation. It holds no data access and no markup
 * beyond the form, because both belong on the other side of this boundary.
 */
export function NotesScreen() {
  const notes = useNotes()
  const creating = useCreateNote()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !creating.isPending

  function submit(): void {
    if (!canSubmit) return
    // The fields clear only once the server has accepted the note, so a refused save leaves what
    // was typed on screen instead of making somebody write it again.
    creating.create({ title: title.trim(), body: body.trim() }, () => {
      setTitle('')
      setBody('')
    })
  }

  return (
    <PageShell title="Notes" description="The example feature, end to end through every layer.">
      <form
        className="app-stack"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <TextField
          id="note-title"
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="What is this note about?"
        />
        <TextField
          id="note-body"
          label="Body"
          value={body}
          onChange={setBody}
          rows={3}
          placeholder="Write it down before it is gone."
        />
        <div className="app-row">
          <Button type="submit" disabled={!canSubmit} busy={creating.isPending}>
            Save note
          </Button>
          {creating.error !== null && (
            <span role="alert" className="app-note-card__meta">
              {creating.error.message}
            </span>
          )}
        </div>
      </form>

      <NoteList
        notes={(notes.data?.notes ?? []).map(toNoteView)}
        isLoading={notes.isLoading}
        error={notes.error === null ? undefined : 'Could not load notes.'}
        emptyMessage="No notes yet. Write the first one above."
      />
    </PageShell>
  )
}
