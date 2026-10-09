import { RPCHandler } from '@orpc/server/fetch'
import { apiRouter } from '@/server/api-router'

/** Every call is request-bound, so nothing here is prerendered at build time. */
export const dynamic = 'force-dynamic'

const handler = new RPCHandler(apiRouter)

async function handle(request: Request): Promise<Response> {
  const result = await handler.handle(request, { prefix: '/api/rpc' })
  return result.matched ? result.response : new Response('Not Found', { status: 404 })
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT }
