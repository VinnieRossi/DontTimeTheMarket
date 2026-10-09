import type { Session } from '@dttm/auth'
import { createInMemoryDatabase } from '@dttm/database/runtime'
import { createRecordingLogger, type LogRecord } from '@dttm/logger'
import {
  FixedClock,
  InMemoryQueueProvider,
  RecordingMailProvider,
  SequentialIdGenerator,
} from '@dttm/providers'
import type { PipelineContext, ServiceContext } from './context'

/**
 * One assembled world per test: a migrated in-process database, a clock that does not move on its
 * own, identifiers that count, and providers that record what they were asked to do. Every
 * dependency is the one a test can inspect, which is what makes an assertion about behavior
 * possible rather than an assertion about whether a method was called.
 */
export const TEST_NOW = new Date('2026-04-01T12:00:00.000Z')

export interface TestWorld {
  service: ServiceContext
  pipeline: PipelineContext
  clock: FixedClock
  mail: RecordingMailProvider
  queue: InMemoryQueueProvider
  logs: LogRecord[]
  /** Change who is calling, to drive the same path as a different role. */
  actAs(session: Session): void
}

export async function createTestWorld(
  session: Session = { userId: 'u_author', role: 'editor' }
): Promise<TestWorld> {
  const db = await createInMemoryDatabase()
  const clock = new FixedClock(TEST_NOW)
  const ids = new SequentialIdGenerator()
  const queue = new InMemoryQueueProvider({ clock })
  const mail = new RecordingMailProvider()
  const { logger, records } = createRecordingLogger('test')

  const service: ServiceContext = { db, logger, clock, ids, queue, session }
  const pipeline: PipelineContext = { db, logger, clock, ids, queue, mail }

  return {
    service,
    pipeline,
    clock,
    mail,
    queue,
    logs: records,
    actAs(next: Session) {
      service.session = next
    },
  }
}
