import { buildJob, type QueueProvider } from '@dttm/contracts'
import { createInMemoryDatabase } from '@dttm/database/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import { FixedClock } from '../system/clock'
import { SequentialIdGenerator } from '../system/id-generator'
import { DrizzleQueueProvider } from './drizzle-queue-provider'
import { InMemoryQueueProvider } from './in-memory-queue-provider'

/**
 * Both implementations of the queue port are held to the same suite. That is the point of a port:
 * if the fake and the real adapter answer differently, then every engine test that used the fake
 * proved something about the fake.
 *
 * The persistent adapter runs against the in-process Postgres, so these are real SQL semantics,
 * including the unique key that makes a duplicate enqueue a no-op and the lease that makes a
 * second worker's completion a conflict.
 */
const NOW = new Date('2026-04-01T12:00:00.000Z')

function noteJob(noteId: string) {
  return buildJob(
    'note_created',
    { noteId, authorId: 'u_1' },
    { idempotencyKey: `note_created:${noteId}` }
  )
}

const implementations: readonly [string, () => Promise<QueueProvider>][] = [
  [
    'in-memory queue',
    () => Promise.resolve(new InMemoryQueueProvider({ clock: new FixedClock(NOW) })),
  ],
  [
    'persistent queue',
    async () =>
      new DrizzleQueueProvider({
        db: await createInMemoryDatabase(),
        ids: new SequentialIdGenerator(),
        clock: new FixedClock(NOW),
      }),
  ],
]

describe.each(implementations)('%s', (_name, build) => {
  let queue: QueueProvider

  beforeEach(async () => {
    queue = await build()
  })

  it('enqueues a job and reports it as newly created', async () => {
    const result = await queue.enqueue(noteJob('n_1'))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.type).toBe('note_created')
      expect(result.value.status).toBe('queued')
      expect(result.value.deduplicated).toBe(false)
    }
  })

  it('treats a second enqueue of the same key as the no-op the key exists to make it', async () => {
    const first = await queue.enqueue(noteJob('n_1'))
    const second = await queue.enqueue(noteJob('n_1'))

    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.value.deduplicated).toBe(true)
      expect(second.value.id).toBe(first.value.id)
    }
  })

  it('claims a due job, counting the attempt and handing back the payload', async () => {
    await queue.enqueue(noteJob('n_1'))
    const claimed = await queue.claimDue({
      now: NOW,
      limit: 10,
      lockToken: 'worker-a',
      leaseSeconds: 60,
    })

    expect(claimed.ok).toBe(true)
    if (claimed.ok) {
      expect(claimed.value).toHaveLength(1)
      expect(claimed.value[0]?.attempts).toBe(1)
      expect(claimed.value[0]?.payload).toEqual({ noteId: 'n_1', authorId: 'u_1' })
      expect(claimed.value[0]?.lockToken).toBe('worker-a')
    }
  })

  it('never hands the same job to two workers at once', async () => {
    await queue.enqueue(noteJob('n_1'))
    const first = await queue.claimDue({ now: NOW, limit: 10, lockToken: 'a', leaseSeconds: 60 })
    const second = await queue.claimDue({ now: NOW, limit: 10, lockToken: 'b', leaseSeconds: 60 })

    if (first.ok && second.ok) {
      expect(first.value).toHaveLength(1)
      expect(second.value).toHaveLength(0)
    }
  })

  it('claims at most the limit it was given', async () => {
    await queue.enqueue(noteJob('n_1'))
    await queue.enqueue(noteJob('n_2'))
    await queue.enqueue(noteJob('n_3'))

    const claimed = await queue.claimDue({ now: NOW, limit: 2, lockToken: 'a', leaseSeconds: 60 })
    if (claimed.ok) expect(claimed.value).toHaveLength(2)
  })

  it('completes a job the caller still holds the lease on', async () => {
    await queue.enqueue(noteJob('n_1'))
    const claimed = await queue.claimDue({ now: NOW, limit: 1, lockToken: 'a', leaseSeconds: 60 })
    const job = claimed.ok ? claimed.value[0] : undefined
    if (job === undefined) throw new Error('expected a claimed job')

    expect((await queue.complete({ jobId: job.id, lockToken: 'a' })).ok).toBe(true)

    const again = await queue.claimDue({ now: NOW, limit: 1, lockToken: 'a', leaseSeconds: 60 })
    if (again.ok) expect(again.value).toHaveLength(0)
  })

  it('refuses to complete a job whose lease has moved on', async () => {
    await queue.enqueue(noteJob('n_1'))
    const claimed = await queue.claimDue({ now: NOW, limit: 1, lockToken: 'a', leaseSeconds: 60 })
    const job = claimed.ok ? claimed.value[0] : undefined
    if (job === undefined) throw new Error('expected a claimed job')

    const result = await queue.complete({ jobId: job.id, lockToken: 'someone-else' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('CONFLICT')
  })

  it('requeues a failed job for later when it still has attempts left', async () => {
    await queue.enqueue(noteJob('n_1'))
    const claimed = await queue.claimDue({ now: NOW, limit: 1, lockToken: 'a', leaseSeconds: 60 })
    const job = claimed.ok ? claimed.value[0] : undefined
    if (job === undefined) throw new Error('expected a claimed job')

    const failed = await queue.fail({
      jobId: job.id,
      lockToken: 'a',
      error: 'mail rejected the address',
      now: NOW,
      retryInSeconds: 30,
    })

    expect(failed.ok).toBe(true)
    if (failed.ok) {
      expect(failed.value.status).toBe('queued')
      expect(failed.value.runAt.getTime()).toBe(NOW.getTime() + 30_000)
    }

    const tooSoon = await queue.claimDue({ now: NOW, limit: 1, lockToken: 'a', leaseSeconds: 60 })
    if (tooSoon.ok) expect(tooSoon.value).toHaveLength(0)

    const later = new Date(NOW.getTime() + 31_000)
    const readyAgain = await queue.claimDue({
      now: later,
      limit: 1,
      lockToken: 'a',
      leaseSeconds: 60,
    })
    if (readyAgain.ok) expect(readyAgain.value).toHaveLength(1)
  })

  it('retires a job as dead when the failure carries no retry', async () => {
    await queue.enqueue(noteJob('n_1'))
    const claimed = await queue.claimDue({ now: NOW, limit: 1, lockToken: 'a', leaseSeconds: 60 })
    const job = claimed.ok ? claimed.value[0] : undefined
    if (job === undefined) throw new Error('expected a claimed job')

    const failed = await queue.fail({
      jobId: job.id,
      lockToken: 'a',
      error: 'out of attempts',
      now: NOW,
    })
    if (failed.ok) expect(failed.value.status).toBe('dead')

    const dead = await queue.listDead({ limit: 10 })
    if (dead.ok) {
      expect(dead.value).toHaveLength(1)
      expect(dead.value[0]?.idempotencyKey).toBe('note_created:n_1')
    }
  })

  it('refuses to record a failure against a lease it does not hold', async () => {
    await queue.enqueue(noteJob('n_1'))
    const claimed = await queue.claimDue({ now: NOW, limit: 1, lockToken: 'a', leaseSeconds: 60 })
    const job = claimed.ok ? claimed.value[0] : undefined
    if (job === undefined) throw new Error('expected a claimed job')

    const result = await queue.fail({
      jobId: job.id,
      lockToken: 'someone-else',
      error: 'nope',
      now: NOW,
      retryInSeconds: 5,
    })
    expect(result.ok).toBe(false)
  })

  it('returns a job to the queue once its lease expires, so a dead worker loses nothing', async () => {
    await queue.enqueue(noteJob('n_1'))
    await queue.claimDue({ now: NOW, limit: 1, lockToken: 'worker-that-died', leaseSeconds: 60 })

    const beforeExpiry = await queue.reclaimExpired({
      now: new Date(NOW.getTime() + 30_000),
      limit: 10,
    })
    if (beforeExpiry.ok) expect(beforeExpiry.value).toEqual({ requeued: 0, dead: [] })

    const afterExpiry = await queue.reclaimExpired({
      now: new Date(NOW.getTime() + 61_000),
      limit: 10,
    })
    if (afterExpiry.ok) expect(afterExpiry.value).toEqual({ requeued: 1, dead: [] })

    const reclaimed = await queue.claimDue({
      now: new Date(NOW.getTime() + 61_000),
      limit: 1,
      lockToken: 'worker-b',
      leaseSeconds: 60,
    })
    if (reclaimed.ok) expect(reclaimed.value).toHaveLength(1)
  })

  it('retires a job as dead when its worker dies on the last attempt, instead of looping it', async () => {
    await queue.enqueue(
      buildJob(
        'note_created',
        { noteId: 'n_1', authorId: 'u_1' },
        { idempotencyKey: 'note_created:n_1', maxAttempts: 2 }
      )
    )

    let at = NOW.getTime()
    await queue.claimDue({ now: new Date(at), limit: 1, lockToken: 'a', leaseSeconds: 60 })
    at += 61_000
    const first = await queue.reclaimExpired({ now: new Date(at), limit: 10 })
    if (first.ok) expect(first.value).toEqual({ requeued: 1, dead: [] })

    await queue.claimDue({ now: new Date(at), limit: 1, lockToken: 'b', leaseSeconds: 60 })
    at += 61_000
    const second = await queue.reclaimExpired({ now: new Date(at), limit: 10 })
    expect(second.ok).toBe(true)
    if (second.ok) {
      expect(second.value.requeued).toBe(0)
      expect(second.value.dead).toHaveLength(1)
      expect(second.value.dead[0]).toMatchObject({ attempts: 2, maxAttempts: 2 })
    }

    const claimable = await queue.claimDue({
      now: new Date(at),
      limit: 10,
      lockToken: 'c',
      leaseSeconds: 60,
    })
    if (claimable.ok) expect(claimable.value).toHaveLength(0)
    const dead = await queue.listDead({ limit: 10 })
    if (dead.ok) expect(dead.value).toHaveLength(1)
  })

  it('reports no dead jobs when none have run out of attempts', async () => {
    await queue.enqueue(noteJob('n_1'))
    const dead = await queue.listDead({ limit: 10 })
    if (dead.ok) expect(dead.value).toHaveLength(0)
  })
})
