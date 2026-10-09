import { buildJob } from '@dttm/contracts'
import { alerts } from '@dttm/database'
import { ConflictError, err } from '@dttm/types'
import { beforeEach, describe, expect, it } from 'vitest'
import { createNote } from '../notes/note-service'
import { createTestWorld, TEST_NOW, type TestWorld } from '../test-support'
import { computeBackoffSeconds, reclaimStalledJobs, runDueJobs } from './engine'
import { createJobHandlers, type JobHandlers } from './handlers'

let world: TestWorld
let handlers: JobHandlers

beforeEach(async () => {
  world = await createTestWorld()
  handlers = createJobHandlers(world.pipeline)
})

function run(overrides: { limit?: number; lockToken?: string; leaseSeconds?: number } = {}) {
  return runDueJobs(
    {
      handlers,
      lockToken: overrides.lockToken ?? 'worker-a',
      leaseSeconds: overrides.leaseSeconds ?? 60,
      limit: overrides.limit ?? 10,
    },
    world.pipeline
  )
}

describe('computeBackoffSeconds', () => {
  it('doubles with each attempt', () => {
    expect(computeBackoffSeconds(1)).toBe(30)
    expect(computeBackoffSeconds(2)).toBe(60)
    expect(computeBackoffSeconds(3)).toBe(120)
  })

  it('stops doubling at the ceiling, so a long-lived job stays reachable', () => {
    expect(computeBackoffSeconds(20)).toBe(3600)
  })

  it('treats a first attempt and a zeroth the same, rather than going negative', () => {
    expect(computeBackoffSeconds(0)).toBe(30)
  })
})

describe('runDueJobs', () => {
  it('does nothing and says so when the queue is empty', async () => {
    const result = await run()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ claimed: 0, completed: 0, retried: 0, dead: 0 })
  })

  it('runs a job to completion and does not run it twice', async () => {
    await createNote({ title: 'First', body: 'b' }, world.service)

    const first = await run()
    if (first.ok) expect(first.value).toEqual({ claimed: 1, completed: 1, retried: 0, dead: 0 })
    expect(world.mail.sent).toHaveLength(1)
    expect(world.mail.sent[0]?.subject).toContain('First')

    const second = await run()
    if (second.ok) expect(second.value.claimed).toBe(0)
    expect(world.mail.sent).toHaveLength(1)
  })

  it('requeues a failed job with backoff instead of dropping it', async () => {
    await createNote({ title: 'First', body: 'b' }, world.service)
    world.mail.failOnce('the address was rejected')

    const failedRun = await run()
    if (failedRun.ok) expect(failedRun.value).toMatchObject({ retried: 1, dead: 0 })

    // Not due yet, so a run right now finds nothing.
    const tooSoon = await run()
    if (tooSoon.ok) expect(tooSoon.value.claimed).toBe(0)

    world.clock.advance(31)
    const retried = await run()
    if (retried.ok) expect(retried.value).toMatchObject({ claimed: 1, completed: 1 })
    expect(world.mail.sent).toHaveLength(1)
  })

  it('gives up after the attempt budget and records an alert somebody can find', async () => {
    await createNote({ title: 'First', body: 'b' }, world.service)

    // Fail every attempt. The budget is five, so the fifth failure retires the job.
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      world.mail.failOnce(`attempt ${attempt} refused`)
      const result = await run()
      if (result.ok && attempt < 5) expect(result.value.retried).toBe(1)
      if (result.ok && attempt === 5) expect(result.value.dead).toBe(1)
      world.clock.advance(computeBackoffSeconds(attempt) + 1)
    }

    const dead = await world.queue.listDead({ limit: 10 })
    if (dead.ok) expect(dead.value).toHaveLength(1)

    const recorded = await world.pipeline.db.select().from(alerts)
    expect(recorded).toHaveLength(1)
    expect(recorded[0]).toMatchObject({ level: 'error' })
    expect(recorded[0]?.detail).toContain('ran out of attempts')
  })

  it('treats a handler that throws the same as one that reports a failure', async () => {
    await createNote({ title: 'First', body: 'b' }, world.service)
    const throwing: JobHandlers = {
      note_created: () => {
        throw new Error('something nobody planned for')
      },
    }

    const result = await runDueJobs(
      { handlers: throwing, lockToken: 'worker-a', leaseSeconds: 60, limit: 10 },
      world.pipeline
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toMatchObject({ claimed: 1, retried: 1 })
  })

  it('rejects a stored payload that no longer matches its schema, at the boundary', async () => {
    const enqueued = await world.queue.enqueue({
      type: 'note_created',
      payload: { noteId: 'note_1' } as never,
      idempotencyKey: 'malformed',
      maxAttempts: 5,
    })
    expect(enqueued.ok).toBe(true)

    const result = await run()
    if (result.ok) expect(result.value).toMatchObject({ claimed: 1, retried: 1 })
    expect(world.mail.sent).toHaveLength(0)
  })

  it('retires a job on its first attempt when the thing it was about is gone', async () => {
    await world.queue.enqueue(
      buildJob(
        'note_created',
        { noteId: 'note_deleted', authorId: 'u_author' },
        { idempotencyKey: 'note_created:note_deleted' }
      )
    )

    const result = await run()
    if (result.ok) {
      expect(result.value).toEqual({ claimed: 1, completed: 0, retried: 0, dead: 1 })
    }
    expect(world.mail.sent).toHaveLength(0)

    const dead = await world.queue.listDead({ limit: 10 })
    if (dead.ok) expect(dead.value).toMatchObject([{ attempts: 1 }])

    const recorded = await world.pipeline.db.select().from(alerts)
    expect(recorded).toHaveLength(1)
    expect(recorded[0]?.detail).toContain('cannot succeed on a later attempt')
  })

  it('claims at most the limit it was given, leaving the rest for the next run', async () => {
    for (const title of ['One', 'Two', 'Three']) {
      await createNote({ title, body: 'b' }, world.service)
    }

    const first = await run({ limit: 2 })
    if (first.ok) expect(first.value.claimed).toBe(2)

    const second = await run({ limit: 2 })
    if (second.ok) expect(second.value.claimed).toBe(1)
  })

  it('reports a lease lost between doing the work and recording it, rather than forcing it', async () => {
    await createNote({ title: 'First', body: 'b' }, world.service)
    const stealing = {
      ...world.pipeline,
      queue: {
        ...world.queue,
        claimDue: (input: Parameters<typeof world.queue.claimDue>[0]) =>
          world.queue.claimDue(input),
        complete: () =>
          Promise.resolve(err(new ConflictError('the lease moved on while the job was running'))),
        fail: (input: Parameters<typeof world.queue.fail>[0]) => world.queue.fail(input),
        enqueue: (input: Parameters<typeof world.queue.enqueue>[0]) => world.queue.enqueue(input),
        reclaimExpired: (input: Parameters<typeof world.queue.reclaimExpired>[0]) =>
          world.queue.reclaimExpired(input),
        listDead: (input: Parameters<typeof world.queue.listDead>[0]) =>
          world.queue.listDead(input),
      },
    }

    const result = await runDueJobs(
      { handlers, lockToken: 'worker-a', leaseSeconds: 60, limit: 10 },
      stealing
    )

    // The work happened, so the mail went out, but the run does not claim it completed.
    expect(world.mail.sent).toHaveLength(1)
    if (result.ok) expect(result.value).toMatchObject({ claimed: 1, completed: 0 })
    expect(world.logs.some((record) => record.message.includes('lease was gone'))).toBe(true)
  })

  it('reports a lease lost while recording a failure, and leaves the job for the sweep', async () => {
    await createNote({ title: 'First', body: 'b' }, world.service)
    world.mail.failOnce('the address was rejected')
    const stealing = {
      ...world.pipeline,
      queue: {
        ...world.queue,
        claimDue: (input: Parameters<typeof world.queue.claimDue>[0]) =>
          world.queue.claimDue(input),
        complete: (input: Parameters<typeof world.queue.complete>[0]) =>
          world.queue.complete(input),
        fail: () => Promise.resolve(err(new ConflictError('the lease moved on'))),
        enqueue: (input: Parameters<typeof world.queue.enqueue>[0]) => world.queue.enqueue(input),
        reclaimExpired: (input: Parameters<typeof world.queue.reclaimExpired>[0]) =>
          world.queue.reclaimExpired(input),
        listDead: (input: Parameters<typeof world.queue.listDead>[0]) =>
          world.queue.listDead(input),
      },
    }

    const result = await runDueJobs(
      { handlers, lockToken: 'worker-a', leaseSeconds: 60, limit: 10 },
      stealing
    )

    if (result.ok) expect(result.value).toMatchObject({ claimed: 1, retried: 0, dead: 0 })
    expect(world.logs.some((record) => record.message.includes('lease was gone'))).toBe(true)
  })

  it('reports the failure rather than throwing when the queue itself is unreachable', async () => {
    const broken = {
      ...world.pipeline,
      queue: {
        ...world.queue,
        claimDue: () =>
          Promise.resolve({
            ok: false as const,
            error: Object.assign(new Error('queue unreachable'), {
              code: 'EXTERNAL_SERVICE_ERROR',
              status: 502,
              provider: 'queue',
            }),
          }),
      },
    }

    const result = await runDueJobs(
      { handlers, lockToken: 'worker-a', leaseSeconds: 60, limit: 10 },
      broken as never
    )
    expect(result.ok).toBe(false)
    expect(world.logs.some((record) => record.message.includes('could not claim'))).toBe(true)
  })
})

describe('reclaimStalledJobs', () => {
  it('returns a job whose worker died to the queue, so nothing is stranded', async () => {
    await createNote({ title: 'First', body: 'b' }, world.service)

    // Claim it and then abandon it, which is what a killed process leaves behind.
    await world.queue.claimDue({
      now: TEST_NOW,
      limit: 1,
      lockToken: 'worker-that-died',
      leaseSeconds: 60,
    })

    const early = await reclaimStalledJobs(10, world.pipeline)
    if (early.ok) expect(early.value).toEqual({ requeued: 0, dead: 0 })

    world.clock.advance(61)
    const reclaimed = await reclaimStalledJobs(10, world.pipeline)
    if (reclaimed.ok) expect(reclaimed.value).toEqual({ requeued: 1, dead: 0 })

    const afterwards = await run()
    if (afterwards.ok) expect(afterwards.value).toMatchObject({ claimed: 1, completed: 1 })
  })

  it('retires a job whose worker keeps dying and raises an alert, instead of looping it', async () => {
    await world.queue.enqueue(
      buildJob(
        'note_created',
        { noteId: 'note_1', authorId: 'u_author' },
        { idempotencyKey: 'note_created:note_1', maxAttempts: 2 }
      )
    )

    await world.queue.claimDue({
      now: world.clock.now(),
      limit: 1,
      lockToken: 'worker-1',
      leaseSeconds: 60,
    })
    world.clock.advance(61)
    const firstSweep = await reclaimStalledJobs(10, world.pipeline)
    if (firstSweep.ok) expect(firstSweep.value).toEqual({ requeued: 1, dead: 0 })

    await world.queue.claimDue({
      now: world.clock.now(),
      limit: 1,
      lockToken: 'worker-2',
      leaseSeconds: 60,
    })
    world.clock.advance(61)
    const secondSweep = await reclaimStalledJobs(10, world.pipeline)
    if (secondSweep.ok) expect(secondSweep.value).toEqual({ requeued: 0, dead: 1 })

    const afterwards = await run()
    if (afterwards.ok) expect(afterwards.value.claimed).toBe(0)

    const recorded = await world.pipeline.db.select().from(alerts)
    expect(recorded).toHaveLength(1)
    expect(recorded[0]).toMatchObject({ level: 'error' })
    expect(recorded[0]?.detail).toContain('ran out of attempts')
  })

  it('says nothing when nothing is stalled', async () => {
    const result = await reclaimStalledJobs(10, world.pipeline)
    if (result.ok) expect(result.value).toEqual({ requeued: 0, dead: 0 })
    expect(world.logs.some((record) => record.message.includes('stalled'))).toBe(false)
  })
})
