/**
 * The types a caller needs in order to use these functions are re-exported here, so the layer
 * above imports one package rather than reaching past this one into the contract. That is what
 * keeps the binding layer's only upstream dependency this package.
 */
export type {
  CreateNoteInput,
  ListNotesInput,
  ListNotesOutput,
  Note,
  UpdateNoteInput,
} from '@dttm/contracts'
export type { ApiClient, ApiClientContext, CreateApiClientOptions } from './client'
export { createApiClient, resolveApiUrl } from './client'
export { queryKeys, STALE_TIME } from './keys'
export { createNote, fetchNote, fetchNotes, updateNote } from './notes'
export type { FakeApiParts } from './test-support'
export { makeFakeApi, makeNote, SAMPLE_NOTE } from './test-support'
