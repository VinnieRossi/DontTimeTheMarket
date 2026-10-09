---
description: How a schema change is made, and what must ship with it
globs:
  - "packages/backend/database/**"
---

# Schema changes

The schema file is the authoritative definition of the data model. Every type downstream derives
from it, so a change here lights up every call site that needs updating, which is the point.

## Making one

1. Change the schema.
2. Generate the migration, and give it a name that says what changed rather than when.
3. Read the generated SQL. Generators get this wrong often enough to be worth the thirty seconds.
4. Commit the schema change and its migration together. A schema change without its migration
   passes review and then fails on deploy, because nothing in the diff showed the gap.

The gate fails a change that edited the schema without generating a migration, so this is a rule
that reports itself rather than one somebody has to remember.

## Rules

- Migrations MUST be generated files that are committed, never a schema pushed directly, because a
  push leaves no record of what the database looked like before and nothing to replay or reverse.
- A destructive change MUST be staged across releases: stop writing the column, ship that, then
  drop it. A drop and the code that stopped needing it cannot land at the same instant, and the gap
  is an error for every request in it.
- A migration MUST say how to reverse it, in a comment when the reversal is not obvious.
- An index belongs with the query that needs it, and a foreign key without one turns a join into a
  scan the first time the table is large.

## Anti-patterns

- Editing a migration that has already been applied anywhere. Write another one.
- Mixing a schema change and a large backfill in one migration. Ship the schema, then backfill in
  the background, because a migration that holds a lock for minutes holds up the deploy behind it.
- Reaching for the database from a service directly. Statements live in the repository module, so a
  schema change has one place to land.
