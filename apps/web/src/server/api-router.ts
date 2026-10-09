import { requireSession, type Session } from '@dttm/auth'
import { apiContract } from '@dttm/contracts'
import { getLogger, type Logger } from '@dttm/logger'
import { resolveMockedProviders } from '@dttm/providers'
import type { ServiceContext } from '@dttm/services'
import { createNote, getNote, listNotes, updateNote } from '@dttm/services'
import { isAppError, RateLimitError } from '@dttm/types'
import { implement, ORPCError } from '@orpc/server'
import { getContainer } from './container'
import { FixedWindowRateLimiter, type RateLimitRule, READ_RULE, WRITE_RULE } from './rate-limit'

/**
 * The transport layer. Each handler resolves the caller, counts the request, calls a service, and
 * translates whatever comes back. It holds no rule of its own: every decision about who may do what
 * and what makes an action invalid lives in the service, so the same rule applies to any other
 * caller of it.
 */
const os = implement(apiContract)

let limiter: FixedWindowRateLimiter | undefined

/** One request, with everything the layers below it need and a logger that names it. */
interface RequestScope {
  service: ServiceContext
  logger: Logger
  session: Session
}

/**
 * Assemble a request: identify the caller, count the request against its rule, and build a logger
 * scoped to it. Every line written under that logger carries the request and the caller, which is
 * what lets one request be followed through the logs afterward.
 */
async function beginRequest(route: string, rule: RateLimitRule): Promise<RequestScope> {
  const { db, logger, providers, session: reader } = await getContainer()
  const session = await requireSession(reader)

  limiter ??= new FixedWindowRateLimiter(providers.clock)
  limiter.check(rule, session.userId)

  const requestLogger = logger.child('request', {
    requestId: providers.ids.next('req'),
    route,
    userId: session.userId,
  })
  requestLogger.debug('request started')

  return {
    logger: requestLogger,
    session,
    service: {
      db,
      logger: requestLogger,
      clock: providers.clock,
      ids: providers.ids,
      queue: providers.queue,
      session,
    },
  }
}

/** The error-to-response mapping, written once, in the order the status table declares it. */
const TRANSPORT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_CONTENT',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'INTERNAL_SERVER_ERROR',
}

/**
 * The one place a domain error becomes a transport error. Handlers do not each decide what a
 * conflict looks like on the wire, and no internal detail reaches the client: an error we raised
 * carries its own code and message, and anything else becomes a plain server error with the cause
 * left in the log.
 */
function toTransportError(error: unknown): ORPCError<string, unknown> {
  if (!isAppError(error)) {
    return new ORPCError('INTERNAL_SERVER_ERROR', { message: 'An unexpected error occurred' })
  }
  const code = TRANSPORT_CODES[error.status] ?? 'INTERNAL_SERVER_ERROR'
  if (error instanceof RateLimitError) {
    return new ORPCError(code, {
      message: error.message,
      data: { retryAfterSeconds: error.retryAfterSeconds },
    })
  }
  return new ORPCError(code, { message: error.message })
}

/**
 * The logger for a failure that happened before a request was scoped. If the container itself will
 * not build, as when live mode refuses to boot, there is no configured logger to ask, so the
 * reason is written to a plain one: an operator has to be able to read why boot was refused.
 */
async function unscopedLogger(): Promise<Logger> {
  try {
    return (await getContainer()).logger
  } catch (bootError) {
    const logger = getLogger('web')
    logger.error('server container failed to build', { error: bootError })
    return logger
  }
}

/**
 * Run one route end to end. Every handler goes through here, so counting the request, scoping the
 * logger, and translating the failure happen once rather than in each of them.
 */
async function handle<T>(
  route: string,
  rule: RateLimitRule,
  run: (scope: RequestScope) => Promise<T>
): Promise<T> {
  let scope: RequestScope | undefined
  try {
    scope = await beginRequest(route, rule)
    const result = await run(scope)
    scope.logger.debug('request finished')
    return result
  } catch (error) {
    const logger = scope?.logger ?? (await unscopedLogger())
    logger.warn('request failed', { route, error })
    throw toTransportError(error)
  }
}

const health = os.health.handler(async () => {
  const { env } = await getContainer()
  return {
    status: 'ok' as const,
    uptimeSeconds: Math.floor(process.uptime()),
    mockedProviders: resolveMockedProviders(env),
  }
})

const list = os.notes.list.handler(({ input }) =>
  handle('notes.list', READ_RULE, (scope) => listNotes(input, scope.service))
)

const getById = os.notes.getById.handler(({ input }) =>
  handle('notes.getById', READ_RULE, (scope) => getNote(input.id, scope.service))
)

const create = os.notes.create.handler(({ input }) =>
  handle('notes.create', WRITE_RULE, (scope) => createNote(input, scope.service))
)

const update = os.notes.update.handler(({ input }) =>
  handle('notes.update', WRITE_RULE, (scope) => updateNote(input, scope.service))
)

/** The router the fetch adapter serves. Its shape is checked against the contract at build time. */
export const apiRouter = os.router({
  health,
  notes: { list, getById, create, update },
})
