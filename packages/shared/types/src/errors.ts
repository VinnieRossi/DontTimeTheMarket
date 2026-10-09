/**
 * Every error this codebase throws extends AppError, so a caller can branch on a stable
 * machine code and a transport layer can map the error to a response without a lookup table
 * that has to be kept in step by hand. Vendor and framework errors are normalized into these
 * at the boundary where they are raised.
 */
export abstract class AppError extends Error {
  /** Stable machine-readable code. Callers branch on this, never on the message. */
  abstract readonly code: string
  /** The HTTP status this error maps to. Owned here so the mapping has one definition. */
  abstract readonly status: number

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = new.target.name
  }
}

/** The request is malformed: a missing field, a wrong type, unparseable input. */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR'
  readonly status = 400
}

/** No valid session. The caller has to authenticate. */
export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED'
  readonly status = 401
}

/** Authenticated, but not permitted to do this. */
export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN'
  readonly status = 403
}

/** The addressed resource does not exist. */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND'
  readonly status = 404

  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`)
  }
}

/** Resource state conflict: a duplicate, or a version that has moved on. */
export class ConflictError extends AppError {
  readonly code = 'CONFLICT'
  readonly status = 409
}

/** The request is well formed but a business rule rejects it. */
export class UnprocessableError extends AppError {
  readonly code: string
  readonly status = 422

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.code = code
  }
}

/** Too many requests from this caller. */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMITED'
  readonly status = 429
  readonly retryAfterSeconds: number

  constructor(retryAfterSeconds: number) {
    super('Too many requests')
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * An external provider failed. The vendor's own error is preserved as `cause` so the trail
 * survives, while callers only ever see this type.
 */
export class ExternalServiceError extends AppError {
  readonly code = 'EXTERNAL_SERVICE_ERROR'
  readonly status = 502
  readonly provider: string

  constructor(provider: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.provider = provider
  }
}

/** Something broke on our side and no more specific error fits. */
export class InternalError extends AppError {
  readonly code = 'INTERNAL_ERROR'
  readonly status = 500
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

/**
 * Normalize anything thrown into an AppError. Used where a boundary has to produce a typed
 * error from a value it did not raise itself, so no unknown throw escapes untyped.
 */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value
  const message = value instanceof Error ? value.message : 'An unexpected error occurred'
  return new InternalError(message, { cause: value })
}
