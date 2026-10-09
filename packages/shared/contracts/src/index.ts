/**
 * The input schemas the routes are built from are re-exported here, so a client needs exactly one
 * import to speak the contract rather than having to know which package each half came from.
 */
export type { CreateNoteInput, ListNotesInput, UpdateNoteInput } from '@dttm/validation'
export {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  UpdateNoteInputSchema,
} from '@dttm/validation'
export type { ApiContract, ApiInputs, ApiOutputs } from './api/contract'
export { apiContract } from './api/contract'
export type { HealthOutput } from './api/health'
export { HealthOutputSchema, health } from './api/health'
export type { GetNoteInput, ListNotesOutput, Note } from './api/notes'
export {
  createNote,
  GetNoteInputSchema,
  getNote,
  ListNotesOutputSchema,
  listNotes,
  NoteSchema,
  notesContract,
  updateNote,
} from './api/notes'
export type {
  JobDeliveryOptions,
  JobEnvelope,
  JobMessage,
  JobPayload,
  JobTypeName,
  NoteCreatedPayload,
} from './jobs/job'
export {
  buildJob,
  DEFAULT_MAX_ATTEMPTS,
  JOB_PAYLOAD_SCHEMAS,
  JOB_TYPES,
  JobType,
  JobTypeSchema,
  NoteCreatedPayloadSchema,
} from './jobs/job'
export type { MailProvider, SendMailInput, SentMail } from './ports/mail'
export type {
  ClaimDueInput,
  ClaimedJob,
  CompleteJobInput,
  EnqueuedJob,
  FailedJob,
  FailJobInput,
  QueueProvider,
  ReclaimedJobs,
} from './ports/queue'
export { EnqueuedJobSchema } from './ports/queue'
export type { Clock, IdGenerator } from './ports/system'
