import { drainJobs } from '@/server/job-runner'
import { authorizePipelineRequest } from '@/server/pipeline-auth'

/** Work runs per request, so this route is never cached or prerendered. */
export const dynamic = 'force-dynamic'

/**
 * Run whatever the pipeline owes. A scheduler calls this on an interval; it is deliberately safe to
 * call twice, because each job is claimed under a lease and every payload carries an idempotency
 * key.
 */
export async function POST(request: Request): Promise<Response> {
  const authorized = authorizePipelineRequest(request)
  if (!authorized.allowed) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: authorized.reason } },
      { status: 403 }
    )
  }

  const result = await drainJobs()
  if (!result.ok) {
    return Response.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status: result.error.status }
    )
  }
  return Response.json({ data: result.value })
}
