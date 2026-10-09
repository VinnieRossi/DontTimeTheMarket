import type { Session } from '@dttm/auth'
import type { Clock, IdGenerator, MailProvider, QueueProvider } from '@dttm/contracts'
import type { Database } from '@dttm/database'
import type { Logger } from '@dttm/logger'

/**
 * Everything a service needs, handed to it rather than reached for. A service that imports its
 * own database handle or its own provider is a service no test can substitute, so the whole set
 * arrives as an argument and the composition root is the only place that decides what fills it.
 */
export interface ServiceContext {
  db: Database
  logger: Logger
  clock: Clock
  ids: IdGenerator
  queue: QueueProvider
  /** Who is asking. Present on every operation that has a caller to authorize. */
  session: Session
}

/** The subset the pipeline needs, which has no caller and therefore no session. */
export interface PipelineContext {
  db: Database
  logger: Logger
  clock: Clock
  ids: IdGenerator
  queue: QueueProvider
  mail: MailProvider
}
