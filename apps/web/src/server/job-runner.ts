import type { PipelineContext, ReclaimSummary } from '@dttm/services'
import { createJobHandlers, type RunSummary, reclaimStalledJobs, runDueJobs } from '@dttm/services'
import { ok, type Result } from '@dttm/types'
import { getContainer } from './container'

/**
 * What the drain endpoint runs. A scheduler calls that endpoint; this function is what it does, so
 * the work is testable without an HTTP request and the route stays a route.
 */
const LEASE_SECONDS = 120
const BATCH_LIMIT = 25

async function pipelineContext(): Promise<PipelineContext> {
  const { db, logger, providers } = await getContainer()
  return {
    db,
    logger: logger.child('pipeline'),
    clock: providers.clock,
    ids: providers.ids,
    queue: providers.queue,
    mail: providers.mail,
  }
}

export interface DrainResult {
  reclaimed: ReclaimSummary
  summary: RunSummary
}

/**
 * Reclaim first, then run. A job whose worker died is returned to the queue before this batch is
 * claimed, so a crash costs one lease interval rather than stranding the job until someone notices.
 *
 * A sweep or a claim that fails is returned as a failure rather than counted as an empty run,
 * because a scheduler that is told everything is fine while the database is down learns about the
 * outage from nothing but the logs.
 */
export async function runDrain(context: PipelineContext): Promise<Result<DrainResult>> {
  const reclaimed = await reclaimStalledJobs(BATCH_LIMIT, context)
  if (!reclaimed.ok) return reclaimed

  const run = await runDueJobs(
    {
      handlers: createJobHandlers(context),
      lockToken: context.ids.next('worker'),
      leaseSeconds: LEASE_SECONDS,
      limit: BATCH_LIMIT,
    },
    context
  )
  if (!run.ok) return run

  return ok({ reclaimed: reclaimed.value, summary: run.value })
}

export async function drainJobs(): Promise<Result<DrainResult>> {
  return runDrain(await pipelineContext())
}
