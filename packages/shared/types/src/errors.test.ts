import { describe, expect, it } from 'vitest'
import {
  AppError,
  ConflictError,
  ExternalServiceError,
  InternalError,
  isAppError,
  NotFoundError,
  RateLimitError,
  toAppError,
  UnprocessableError,
  ValidationError,
} from './errors'

describe('error hierarchy', () => {
  it('maps each error type to its documented status', () => {
    expect(new ValidationError('bad input').status).toBe(400)
    expect(new NotFoundError('Note', 'n_1').status).toBe(404)
    expect(new ConflictError('already exists').status).toBe(409)
    expect(new UnprocessableError('LIMIT_REACHED', 'too many').status).toBe(422)
    expect(new RateLimitError(30).status).toBe(429)
    expect(new InternalError('broke').status).toBe(500)
    expect(new ExternalServiceError('mail', 'send failed').status).toBe(502)
  })

  it('carries a stable code independent of the message', () => {
    expect(new ValidationError('anything at all').code).toBe('VALIDATION_ERROR')
    expect(new UnprocessableError('NOTE_LIMIT_REACHED', 'too many notes').code).toBe(
      'NOTE_LIMIT_REACHED'
    )
  })

  it('names itself after its own class, so logs identify the type', () => {
    expect(new ConflictError('duplicate').name).toBe('ConflictError')
  })

  it('builds the not-found message from the entity and id', () => {
    expect(new NotFoundError('Note', 'n_7').message).toBe('Note not found: n_7')
  })

  it('preserves the vendor error as the cause', () => {
    const vendor = new Error('connection reset')
    const wrapped = new ExternalServiceError('mail', 'send failed', { cause: vendor })
    expect(wrapped.cause).toBe(vendor)
    expect(wrapped.provider).toBe('mail')
  })

  it('recognizes its own errors and rejects foreign ones', () => {
    expect(isAppError(new ValidationError('x'))).toBe(true)
    expect(isAppError(new Error('x'))).toBe(false)
    expect(isAppError('x')).toBe(false)
  })

  it('is an Error, so it survives a generic catch', () => {
    expect(new ValidationError('x')).toBeInstanceOf(Error)
    expect(new ValidationError('x')).toBeInstanceOf(AppError)
  })
})

describe('toAppError', () => {
  it('passes an AppError through unchanged', () => {
    const original = new ConflictError('duplicate')
    expect(toAppError(original)).toBe(original)
  })

  it('wraps a plain Error, keeping its message and cause', () => {
    const thrown = new Error('socket closed')
    const normalized = toAppError(thrown)
    expect(normalized).toBeInstanceOf(InternalError)
    expect(normalized.message).toBe('socket closed')
    expect(normalized.cause).toBe(thrown)
  })

  it('wraps a non-Error throw without leaking it into the message', () => {
    const normalized = toAppError({ weird: true })
    expect(normalized.code).toBe('INTERNAL_ERROR')
    expect(normalized.message).toBe('An unexpected error occurred')
  })

  it('carries the retry hint on a rate-limit error', () => {
    expect(new RateLimitError(45).retryAfterSeconds).toBe(45)
  })
})
