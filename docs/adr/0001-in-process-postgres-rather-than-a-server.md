# 1. An in-process Postgres rather than a database server

## Status

Accepted.

## Context

The architecture rules call for one authoritative schema, types derived from it, and versioned
migration files. They name Prisma and a Postgres server in the reference layer, which is the layer
that names current tools and is expected to change.

This template has a harder constraint than a typical project: a fresh clone has to install,
typecheck, lint, test, build, and build Storybook with no accounts, no secrets, and no Docker. The
database-backed tests are the part that constraint bites. A test that needs a server needs somebody
to start one, and a template whose first run is red teaches its reader that red is normal.

## Decision

Drizzle against PGlite, an in-process Postgres.

The schema is one file, the row types derive from it, the validation schemas derive from those, and
`drizzle-kit` writes versioned SQL migrations that are committed alongside the schema change. Tests
open their own migrated database per test, and the app keeps its files in a directory.

## Consequences

A fresh clone is green with nothing installed, and the database tests exercise real Postgres
semantics rather than a substitute: the unique constraints, the enum rejections, and the claim
statement behind the job queue are all really enforced.

The cost is a single writer. One process at a time opens a given data directory, so a separate
worker process cannot share the app's database. The drain endpoint therefore runs inside the app
rather than as its own process.

Moving to a hosted Postgres is one function, `createPersistentDatabase`, and no caller changes,
because callers depend on the `Database` type rather than on how the connection was made.
