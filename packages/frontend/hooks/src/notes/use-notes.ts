import {
  fetchNotes,
  type ListNotesInput,
  type ListNotesOutput,
  queryKeys,
  STALE_TIME,
} from '@dttm/queries'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '../provider'

export interface UseNotesResult {
  data: ListNotesOutput | undefined
  isLoading: boolean
  error: Error | null
}

/**
 * Bind the note list to a query. It is deliberately thin: it names the cache key, names how long
 * the data stays fresh, and hands back the three states a page has to render. No filtering, no
 * sorting, no business rule, because all three belong on the side of the boundary that can enforce
 * them.
 */
export function useNotes(input: ListNotesInput = {}): UseNotesResult {
  const api = useApi()
  const query = useQuery({
    queryKey: queryKeys.notes.list(input),
    queryFn: () => fetchNotes(api, input),
    staleTime: STALE_TIME.active,
  })
  return { data: query.data, isLoading: query.isLoading, error: query.error }
}
