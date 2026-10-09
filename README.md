# ai-quickstart

A monorepo template for projects built with AI agents.
Strict from the first commit, layered so an agent can navigate it by path, and wired so the rules are enforced by checks rather than by whoever is reviewing.

It installs, typechecks, lints, tests, builds, and builds Storybook on a fresh clone, with no accounts, no secrets, and no Docker.

## Starting a project from it

On GitHub, press **Use this template**, then:

```
git clone <your-new-repository>
cd <your-new-repository>
pnpm install
pnpm init-project --name my-project --scope @my-project
pnpm install
pnpm verify
```

`init-project` renames the placeholder project and package scope everywhere they appear: every manifest, every import, and the dependency allowlist.
Run it with `--dry-run` first if you want to see what it will touch.
`pnpm verify` should pass before you write anything of your own; that green run is the baseline every later change is measured against.

Then:

1. Rewrite `docs/architecture.md` for what you are actually building. Everything else routes back to it.
2. Rewrite `AGENTS.md` to match. It is the file every agent session reads first.
3. Replace the note example with your first real feature, and delete what is left of it.

### What you need installed

Node and pnpm, at the versions in `.nvmrc` and `package.json`.
Nothing else: the database runs in-process, and every external service has an in-process implementation that needs no account.

## The commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the app at `http://localhost:3000` |
| `pnpm verify` | The gate: lint, the validators, typecheck, tests with coverage, both builds |
| `pnpm test` | Every test suite |
| `pnpm typecheck` | Every package |
| `pnpm lint` / `pnpm lint:fix` | Lint and format |
| `pnpm storybook` | The design system at `http://localhost:6006` |
| `pnpm validate` | The repository validators on their own, which is the fast subset |
| `pnpm db:generate` | Writes a migration after a schema change |
| `pnpm test:e2e` | The functional Playwright suite: one real flow through the notes example |
| `pnpm test:visual` | Visual regression against the app and every Storybook story |
| `pnpm test:visual:update` | Regenerates the committed baselines after an intentional visual change |

## What is in here

```
apps/web                      the app: routing, composition, server wiring
apps/e2e                      Playwright: visual regression and one functional e2e flow
packages/shared/config        TypeScript bases, lint rules, coverage thresholds
packages/shared/types         the error hierarchy and the Result type
packages/shared/utils         pure helpers
packages/shared/logger        the one logger, with redaction
packages/shared/env           the environment schema, parsed once at boot
packages/shared/validation    input schemas, shared by the API and the forms
packages/shared/contracts     the API contract, the provider ports, the job contract
packages/backend/database     the schema source of truth, its migrations, its clients
packages/backend/providers    an implementation and a fake for every port
packages/backend/auth         roles, permission checks, the session port
packages/backend/services     business logic and the durable job pipeline
packages/frontend/theme       design tokens
packages/frontend/ui          stateless components, each with a story and a test
packages/frontend/queries     typed calls against the contract, and the cache keys
packages/frontend/hooks       React integration over those calls
scripts                       the gate and the repository validators
.agents, .claude              the instruction layer: rules, subagents, hooks
```

`docs/architecture.md` has the layer table and the three import rules that are stricter than the layers alone.

## The example feature

One note, running through every layer: a table, a validation schema, a contract route, a service, a durable job, a query, a hook, a component with its story, a composed page, and a test at each level.
It exists to be the pattern new work copies, so read it before adding a feature.
It is deliberately dull, and it is meant to be deleted once you have a real one.

## Playwright

`apps/e2e` runs two suites. Visual regression compares the app's one screen and every Storybook
story against committed PNG baselines under `apps/e2e/visual-baselines/`; it is not part of the
gate because a screenshot diff is platform-specific, and runs as its own CI job instead. Functional
e2e drives one real flow through the notes example against a throwaway in-process database, with
no Docker and nothing shared to reset, so it is part of `pnpm verify` like everything else.
`apps/e2e/AGENTS.md` says how to add a test to either one and how to update a baseline.

## Known gaps

This template deliberately ships without some things a real project eventually needs, so a fresh
clone is alerted to pick them rather than assuming they are already handled:

- **Production log shipping.** Logs go through `@dttm/logger` but only ever reach the console; wire
  a sink (Datadog, an OpenTelemetry collector, and so on) before running this in production.
- **Error tracking.** Nothing here reports an unhandled exception anywhere; add Sentry or an
  equivalent once there is a production deployment to watch.
- **Branch protection.** The CI workflow runs on every pull request, but nothing in this repository
  can require it to pass before a merge; configure that in the GitHub repository's settings.
- **Real vendor adapters.** Every external capability ships a live port with no real implementation
  behind it (see `docs/architecture.md`); wire one in before switching `PROVIDER_MODE` to `live`.

## The gate

One command runs every check, and the same command runs everywhere: pre-commit runs its staged subset, pre-push runs it whole, and CI runs it on a clean checkout.
There is one definition of passing.

Five validators run inside it, each because a rule that nothing checks is a suggestion:

- the dependency allowlist, which fails an import that flows the wrong way and a package nobody registered
- file size limits, so an orchestration file that is growing gets split rather than skimmed
- a suppression scanner, which blocks the escape hatches an agent reaches for when it cannot make something pass
- a writing check for long dashes and British spellings
- instruction-file governance: the root file stays inside its length budget, indexes the package files, and the tool-specific names stay symlinks to it

Never bypass it.
A blocked commit means the code is wrong or the rule is wrong, and both are fixed upstream of the bypass.

## Configuration

Copy `.env.example` to `.env.local` if you want to change anything.
Nothing in it is required: the defaults are a working local setup.

`PROVIDER_MODE` decides what happens at the boundaries that reach outside the system.
In `mock`, nothing is contacted and what would have been sent is recorded, which is why a fresh clone runs with no accounts.
In `live`, every capability needs a real adapter, and boot refuses while one is still a fake or log-only, naming which.
The template ships no real mail adapter or session reader, so a project wires those before it can run live or in production.
The queue is not part of that choice: it is always durable, because work held in a process disappears when the process does.

Each provider also has its own optional override, for example `MAIL_PROVIDER_MODE`, which takes precedence over `PROVIDER_MODE` and otherwise inherits it.
That is what lets an incremental build run one capability live while another is still mocked.
In production, a provider only runs mocked when its own override says so explicitly; inheriting a mocked global default there fails boot, naming the provider.

## The database

An in-process Postgres, so there is nothing to install and nothing to start.
It keeps its files in the directory `DATABASE_DIR` names, and tests run against their own throwaway one.

A project moving to a hosted Postgres replaces one function, `createPersistentDatabase`, and changes no caller, because callers depend on the `Database` type rather than on how the connection was made.
One thing to know first: the in-process database allows a single writer, so one process at a time opens a given directory.

Schema changes are migrations, generated with `pnpm db:generate` and committed alongside the schema change itself.
CI fails a change that edited the schema and forgot to generate one.

## Working with agents in it

`AGENTS.md` is the canonical instruction file, and `CLAUDE.md` is a symlink to it.
Contextual rules live under `.agents/rules/` and load by path.
Four subagents are defined under `.agents/agents/`: one writes failing tests, one implements against them, one reviews read-only, and one drives the running app.

Four lifecycle hooks are wired in `.claude/settings.json`: a guard that blocks irreversible shell commands, a guard that blocks reading credentials or writing them into a tracked file, a check that lints every file as it is written, and a note taken before context is compacted.
Each is tested against a real payload in both its pass and its block case, because a hook nobody fed a payload is a hypothesis rather than a guard.

The permissions allow the everyday development commands, deny the handful that cannot be undone, and ask about nothing.
`docs/architecture.md` says why.
