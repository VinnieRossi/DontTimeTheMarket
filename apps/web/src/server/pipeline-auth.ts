import { createHash, timingSafeEqual } from 'node:crypto'
import { parseEnv } from '@dttm/env'

/**
 * The drain endpoint runs work on a schedule, so anyone who can reach it can make the application
 * do that work. It is protected by a shared secret, and the environment schema refuses to boot in
 * production or live mode without one, so an open endpoint is only ever a local one.
 */
export type PipelineAuthResult = { allowed: true } | { allowed: false; reason: string }

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

export function authorizePipelineRequest(request: Request): PipelineAuthResult {
  const secret = parseEnv().PIPELINE_SECRET
  if (secret === undefined) return { allowed: true }

  const offered = request.headers.get('authorization') ?? ''
  // Both sides are hashed so the comparison is constant time and takes equal-length inputs.
  return timingSafeEqual(digest(offered), digest(`Bearer ${secret}`))
    ? { allowed: true }
    : { allowed: false, reason: 'the shared secret did not match' }
}
