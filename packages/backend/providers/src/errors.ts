import { ExternalServiceError, err, ok, type Result } from '@dttm/types'

/**
 * The one boundary where an external failure becomes this codebase's own error. Adapters wrap
 * every outside call, so a business caller only ever sees an ExternalServiceError in the Result
 * error channel and never learns which library raised it. The original is kept as the cause, so
 * the trail survives for whoever debugs it.
 */
export function toExternalServiceError(
  provider: string,
  message: string,
  cause: unknown
): ExternalServiceError {
  return new ExternalServiceError(provider, message, { cause })
}

/**
 * Run a call that can throw and turn any failure into an ExternalServiceError in the Result
 * error channel. This is the only place an adapter catches, which is what lets every caller
 * branch on `result.ok` instead of carrying its own try/catch.
 */
export async function wrapExternalCall<T>(
  provider: string,
  message: string,
  call: () => Promise<T>
): Promise<Result<T, ExternalServiceError>> {
  try {
    return ok(await call())
  } catch (cause) {
    return err(toExternalServiceError(provider, message, cause))
  }
}
