import type { ApiContract } from '@dttm/contracts'
import { ValidationError } from '@dttm/types'
import type { ClientLink } from '@orpc/client'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'

/**
 * The typed client. Its shape is inferred from the contract, so there is no hand-written
 * description of the API on this side to drift from the one the server implements: a route that
 * changes shape breaks the call site rather than the response.
 */
export type ApiClient = ContractRouterClient<ApiContract>

/** This layer sends no per-call context, so the context type is deliberately empty. */
export type ApiClientContext = Record<never, never>

/** Where the server mounts the handler, appended to the resolved origin. */
const DEFAULT_API_PATH = '/api/rpc'

export interface CreateApiClientOptions {
  /**
   * The origin to call. A browser can leave it out and get its own origin, which is what keeps a
   * call same-origin without the app knowing its own address. Anything running outside a browser
   * has to say where the server is.
   */
  baseUrl?: string
  /**
   * The transport. Production passes nothing and gets an HTTP link; a test passes a fake so no
   * request leaves the process, which is what makes the binding layer testable at all.
   */
  link?: ClientLink<ApiClientContext>
  path?: string
}

/**
 * Build the absolute address of the handler. The transport needs an absolute URL: a relative one
 * cannot be constructed at all, and the failure surfaces as an empty screen with nothing in the
 * network log to explain it, because no request was ever attempted.
 */
export function resolveApiUrl(baseUrl: string | undefined, path = DEFAULT_API_PATH): string {
  const origin = baseUrl !== undefined && baseUrl !== '' ? baseUrl : globalThis.location?.origin
  if (origin === undefined || origin === '') {
    throw new ValidationError(
      'createApiClient needs a baseUrl outside a browser, because there is no origin to resolve against'
    )
  }
  return new URL(path, origin).toString()
}

/**
 * Build the client. The address is resolved per call rather than here, because a client component
 * is also rendered on the server, where there is no origin to resolve: deciding the address at
 * construction time makes a server render fail on a client that render never calls.
 */
export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const link =
    options.link ??
    new RPCLink<ApiClientContext>({ url: () => resolveApiUrl(options.baseUrl, options.path) })
  return createORPCClient<ApiClient>(link)
}
