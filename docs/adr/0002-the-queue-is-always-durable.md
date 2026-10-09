# 2. The queue is always durable

## Status

Accepted, replacing an earlier arrangement where the queue followed `PROVIDER_MODE`.

## Context

`PROVIDER_MODE=mock` exists so a fresh clone runs with no accounts: nothing external is contacted
and what would have been sent is recorded. The queue was originally part of that choice, so mock
mode held jobs in a map.

Driving the running app is what found the problem. A note was created, its follow-up job was
enqueued, and the drain endpoint reported nothing to do. A web app's routes are bundled separately,
so the route that enqueued the job and the route that drained it never shared the map at all. Every
test passed, because the tests held both halves in one process.

The same failure exists in a less obvious form in production: a queue in memory loses everything it
holds at the next restart, which is exactly the silent loss the pipeline exists to prevent.

## Decision

The queue is always the durable one, backed by a table. `PROVIDER_MODE` governs only the boundaries
that reach outside the system, which is what it was for.

The in-memory queue stays in the providers package as a test double. It passes the same suite as the
durable one, including the lease semantics, so an engine tested against it is tested against the
behavior the real adapter has. It is never selected by the factory.

## Consequences

Work survives a restart and crosses a bundle boundary, and the pipeline's promise holds.

Anything that enqueues now needs a database, including in mock mode. That is not a new dependency
in practice, since the domain it serves already had one.
