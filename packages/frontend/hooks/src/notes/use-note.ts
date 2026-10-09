import { fetchNote, type Note, queryKeys, STALE_TIME } from '@dttm/queries'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../provider'

export interface UseNoteResult {
  data: Note | undefined
  isLoading: boolean
  error: Error | null
}

/** One note. Skipped entirely when there is no id yet, so a page can mount before it has one. */
export function useNote(id: string | undefined): UseNoteResult {
  const api = useApi()
  const query = useQuery({
    queryKey: queryKeys.notes.detail(id ?? ''),
    queryFn: () => fetchNote(api, id ?? ''),
    staleTime: STALE_TIME.reference,
    enabled: id !== undefined,
  })
  return { data: query.data, isLoading: query.isLoading, error: query.error }
}
