import type {
  CreateNoteInput,
  ListNotesInput,
  ListNotesOutput,
  Note,
  UpdateNoteInput,
} from '@dttm/contracts'
import type { ApiClient } from './client'

/**
 * Data access as plain functions. They take the client, so nothing here reaches for a singleton,
 * and they hold no React: the hooks package wraps them, and a server-rendered page or a script can
 * call the same function without pulling a framework in with it.
 */

export function fetchNotes(
  client: ApiClient,
  input: ListNotesInput = {}
): Promise<ListNotesOutput> {
  return client.notes.list(input)
}

export function fetchNote(client: ApiClient, id: string): Promise<Note> {
  return client.notes.getById({ id })
}

export function createNote(client: ApiClient, input: CreateNoteInput): Promise<Note> {
  return client.notes.create(input)
}

export function updateNote(client: ApiClient, input: UpdateNoteInput): Promise<Note> {
  return client.notes.update(input)
}
