---
description: Conventions for business logic and for the durable job pipeline
globs:
  - "packages/backend/services/**"
---

# Services and the pipeline

A service holds the rules: who may act, what makes an action invalid, and what else follows when
one succeeds. The transport layer above it decides nothing, so the same rule applies to any other
caller.

## Rules

- A service MUST take its database, its clock, its identifiers, and its providers as arguments.
  A service that reaches for any of them is a service no test can point somewhere else, and a
  result that depends on the wall clock is a test that fails on a slow machine for no reason.
- An operation that cannot proceed MUST throw a typed error, because a caller that forgot to check
  a returned one would carry on as though it had succeeded.
- Work that can fail on its own MUST be enqueued rather than done inline, so a slow or failing side
  effect cannot fail the operation the caller asked for.
- Every job payload carries an idempotency key derived from the thing it is about, because a queue
  delivers at least once and the second delivery must be a no-op.
- A handler MUST return a failure rather than throw, and MUST NOT retry on its own: the engine owns
  the retry schedule, and a handler with its own loop hides how many attempts really happened.

## Adding a job type

1. Add the literal to the job type list and its payload schema to the table beside it. The
   `satisfies` checks make a missing entry a compile error.
2. Write the handler. Return a failure for anything the caller should retry, and for anything that
   cannot succeed on a later attempt return a `NonRetryableError`, since retrying a note that was
   deleted burns the budget on work that can never finish.
3. Enqueue it from the service that causes it, with an idempotency key.
4. Test the success path, the retry path, and what happens when the attempts run out.

## Anti-patterns

- Catching an error to log it and carrying on. That is the silent failure the pipeline exists to
  prevent.
- Reading the current time or generating an identifier directly.
- Putting a rule in a handler that belongs in the service, so it applies to a job and not to the
  operation that enqueued it.
