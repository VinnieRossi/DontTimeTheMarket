# Architecture

This is the architecture note every project generated from this template starts with.
Rewrite the domain sections when you use the template; keep the layer rules.

## What this template is

A monorepo skeleton for an AI-assisted project: strict TypeScript, a layered package graph, one validation gate, agent governance, and a single example feature that runs through every layer so new work has a pattern to copy.

It installs, typechecks, lints, tests, builds, and builds Storybook with no external accounts, no real secrets, and no Docker.
Every third-party capability defaults to an in-process fake, and the database-backed tests run against an in-process Postgres.

## Data flow

The example feature is a note: a title, a body, and a status.
It exists to be uninteresting, so the shape of the flow is the only thing worth reading.

```
schema (notes table)
    -> validation (one zod schema per input)
    -> contract (typed routes over those schemas)
    -> service (business rules, enqueues a durable job)
    -> router handler (thin, authorizes, calls the service)
    -> query function (typed client call)
    -> hook (React integration)
    -> page (composition only)
    -> component (props in, callbacks out)
```

Actions flow back up the same path.
A note created in the UI reaches the service, which writes the row and enqueues a `note_created` job; the pipeline claims that job, runs its handler, and either completes it or retries it with backoff before dead-lettering it with an alert, or dead-letters it on the first attempt when the handler reports that no later attempt can succeed.

## Domains

One: notes.
A real project replaces it.
The point of keeping exactly one is that the example never becomes a second architecture to maintain alongside the real one.

## External services

Every external capability sits behind a port this repository owns, with a live adapter and an in-process fake:

| Port | Fake | Live adapter |
|---|---|---|
| Queue | in-memory map, used by tests | Postgres outbox table |
| Mail | records what was sent, asserted in tests | left unimplemented on purpose, wired by the project that needs it |
| Clock | fixed instant, injected into every time-dependent path | system clock |

`PROVIDER_MODE` selects between them.
`mock` is the default so a fresh clone runs with an empty `.env`.
`live` makes a capability with no real adapter a loud failure at boot rather than a silent fall back to a fake that drops work.

Each provider has its own optional `<NAME>_PROVIDER_MODE` override (`MAIL_PROVIDER_MODE` today), which takes precedence over the global default when set and otherwise inherits it.
This is what lets a project build incrementally, running one capability live while another is still mocked, without either the global switch or a code change standing in the way.
In production, a provider may run mocked only when its own override says so explicitly: inheriting a mocked global default in production fails boot, naming the provider, and an explicit mock override in production logs one warning and shows up in the health endpoint's `mockedProviders` list.
See `docs/adr/0005-per-provider-mode-override.md` for the full argument.

## Layers

Imports flow downward only, and the check that enforces it runs in the gate.
The band names follow the canonical layer vocabulary the architecture library defines.

| Layer | Packages | May import |
|---|---|---|
| 5 Apps | `apps/web` | everything below |
| 4 Application | `@dttm/ui`, `@dttm/hooks`, `@dttm/queries` | see the within-layer rules |
| 3 Feature | `@dttm/services` | database, contracts, validation, types, logger, utils, env |
| 2 Infrastructure | `@dttm/contracts`, `@dttm/providers`, `@dttm/auth` | foundation only |
| 1 Foundation | `@dttm/config`, `@dttm/types`, `@dttm/logger`, `@dttm/env`, `@dttm/utils`, `@dttm/validation`, `@dttm/database`, `@dttm/theme` | see the within-layer rules |

Three rules are stricter than the band numbering alone implies, and each one is enforced by `pnpm validate:architecture` rather than by review:

- `@dttm/ui` may import `@dttm/types` and `@dttm/theme` only.
  It may not import `@dttm/hooks` or `@dttm/queries`, even though all three sit in Application, because a component that reaches for data cannot be rendered from props alone.
- `@dttm/queries` may not import `@dttm/services`.
  Application reaches Feature only through the contract; the frontend calls an API, it does not invoke a service function.
- Within Foundation, `@dttm/types` and `@dttm/validation` may import `@dttm/database` for type derivation.
  Nothing else in Foundation imports anything internal.

## Single source of truth

The database schema owns the data model.
Types are derived from it, the validation schemas are derived from those types where they describe stored data, and the contract is built from the validation schemas.
No layer restates a type a lower layer already owns, and the architecture check fails a package that tries.

## The gate

One command runs every check: `pnpm verify`.
Pre-commit runs its staged subset, pre-push runs it whole, and CI runs the same command on a clean checkout.
There is one definition of passing, so "green locally" and "green in CI" mean the same thing.

### Why the agent permissions have no confirmation list

The checked-in agent settings allow the everyday development commands, deny the handful that cannot be undone, and ask about nothing.

That is deliberate, and it follows from two things.
A confirmation prompt a session hits many times a day gets approved without being read, which makes it no safer than an allowance while still costing a person their attention; and a prompt nobody is awake to answer stalls an unattended run or is auto-denied, which is worse than either outcome.

What actually protects the repository runs whether or not anyone is watching: the commit-message hook rejects a verification bypass, the pre-commit and pre-push hooks run the gate, the `PreToolUse` guard blocks a force push, a hard reset, a recursive delete, and a push to the default branch before the command executes, and branch protection requires the gate to pass before anything merges.
Those are enforcement. A prompt is a request.

A project that does want a person in the loop at the commit boundary should put that rule in its own untracked local settings rather than in the template, so an agent working the repository unattended is not blocked by a question nobody will answer.

## Deliberate deviations

Three choices differ from what the architecture library's reference layer names, each for a stated reason.
The ADRs under `docs/adr/` carry the full argument.

- The ORM is Drizzle rather than Prisma, because the template has to run its database-backed tests in-process with no Docker and no hosted database, and Drizzle runs directly against PGlite while keeping a single authoritative schema, derived types, and versioned SQL migrations.
- The API contract library is oRPC rather than ts-rest.
  Both satisfy the requirement that the contract is the one definition both sides consume.
- There is no live mail adapter or session reader.
  Shipping a vendor SDK nobody selected would pick a provider for the project rather than leaving the choice where it belongs, so the port and its fake ship and boot refuses in live mode or production until the project wires a real one.
