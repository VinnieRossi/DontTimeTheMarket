import type { QueueProvider } from '@dttm/contracts'
import { createInMemoryDatabase } from '@dttm/database/runtime'
import { createRecordingLogger } from '@dttm/logger'
import {
  FixedClock,
  InMemoryQueueProvider,
  RecordingMailProvider,
  SequentialIdGenerator,
} from '@dttm/providers'
import type { PipelineContext } from '@dttm/services'
import { ExternalServiceError, err } from '@dttm/types'
import { describe, expect, it } from 'vitest'
import { runDrain } from './job-runner'

/**
 * The drain is what a scheduler hits, so its contract with the scheduler is what matters here: an
 * outage must reach it as a failure, not as a quiet run that found nothing to do.
 */
async function pipelineWith(
  override: Partial<QueueProvider> = {}
): Promise<{ context: PipelineContext }> {
  const clock = new FixedClock(new Date('2026-04-01T12:00:00.000Z'))
  const queue = new InMemoryQueueProvider({ clock })
  const { logger } = createRecordingLogger('test')
  return {
    context: {
      db: await createInMemoryDatabase(),
      logger,
      clock,
      ids: new SequentialIdGenerator(),
      queue: {
        enqueue: (input) => queue.enqueue(input),
        claimDue: (input) => queue.claimDue(input),
        complete: (input) => queue.complete(input),
        fail: (input) => queue.fail(input),
        reclaimExpired: (input) => queue.reclaimExpired(input),
        listDead: (input) => queue.listDead(input),
        ...override,
      },
      mail: new RecordingMailProvider(),
    },
  }
}

const outage = () => Promise.resolve(err(new ExternalServiceError('queue', 'the queue is down')))

describe('runDrain', () => {
  it('reports an empty queue as a successful run that did nothing', async () => {
    const { context } = await pipelineWith()

    const result = await runDrain(context)

    expect(result).toEqual({
      ok: true,
      value: {
        reclaimed: { requeued: 0, dead: 0 },
        summary: { claimed: 0, completed: 0, retried: 0, dead: 0 },
      },
    })
  })

  it('fails rather than reporting an empty run when jobs cannot be claimed', async () => {
    const { context } = await pipelineWith({ claimDue: outage })

    const result = await runDrain(context)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.status).toBe(502)
  })

  it('fails rather than reporting an empty run when the stalled-job sweep cannot run', async () => {
    const { context } = await pipelineWith({ reclaimExpired: outage })

    const result = await runDrain(context)

    expect(result.ok).toBe(false)
  })
})
