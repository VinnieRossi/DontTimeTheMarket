import { type CreateNoteInput, createNote, type Note, queryKeys } from '@dttm/queries'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../provider'

export interface UseCreateNoteResult {
  /**
   * Submit a note. The callback runs only when the server accepted it, so a caller can clear its
   * form there rather than optimistically: clearing on submit throws away what somebody typed the
   * moment the save is refused, and the refusal is exactly when they need it back.
   */
  create: (input: CreateNoteInput, onCreated?: (note: Note) => void) => void
  isPending: boolean
  error: Error | null
  created: Note | undefined
}

/**
 * Create a note and invalidate the lists that now have one more row in them. The invalidation is
 * precise: the note group and nothing else, because invalidating the whole cache refetches screens
 * nobody changed and invalidating too little leaves a list showing yesterday's rows.
 */
export function useCreateNote(): UseCreateNoteResult {
  const api = useApi()
  const cache = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: CreateNoteInput) => createNote(api, input),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: queryKeys.notes.all })
    },
  })

  return {
    create: (input, onCreated) => {
      mutation.mutate(input, {
        ...(onCreated !== undefined ? { onSuccess: onCreated } : {}),
      })
    },
    isPending: mutation.isPending,
    error: mutation.error,
    created: mutation.data,
  }
}
