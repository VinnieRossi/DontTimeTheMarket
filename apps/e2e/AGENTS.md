# @dttm/e2e

Playwright, two intentionally separate tracks. It imports no other `@dttm/*` package: both suites
reach their target over HTTP and UI only, so a change here never has an internal shortcut to take.

## Visual regression (`playwright.config.ts`, `*.visual.ts`)

`tests/app.visual.ts` covers the example feature's one screen; `tests/storybook.visual.ts` covers
every Storybook story, discovered from the built story index rather than a hand-kept list, so a
new story gets a baseline the first time someone runs `test:visual:update` after adding it. Both
targets render from a fixed source (a freshly reset database, and stories from their own args), so
a diff means something changed, not that the run got unlucky.

Not part of `pnpm verify`: a screenshot diff is platform-specific, so it runs as its own CI job.
Baselines are captured on that job's exact Linux runner, not on a contributor's own machine, the
same way the suite this one is patterned on regenerates them in its fixed container. Update them by
running the "Update visual baselines" GitHub Actions workflow (`workflow_dispatch`) against your
branch, which runs `test:visual:update` on that runner and commits the result; running
`pnpm test:visual:update` locally works for a quick check but its output should not be the one you
commit, because a different OS renders text with different antialiasing.

**Adding a visual test:** a new app page goes in the `SCREENS` list in `tests/app.visual.ts`. A new
story needs nothing added here at all; it is picked up the next time baselines are regenerated.

## Functional e2e (`playwright.func.config.ts`, `*.func.ts`)

One real flow through the notes example: create a note through the UI, confirm it survives a
reload (so it is proven to persist, not just to render from client state), then drain the durable
queue and confirm the job the creation enqueued completed. Runs against `next dev`, never a
production build: `next start` forces `NODE_ENV=production`, and `resolveSessionReader` in
`apps/web/src/server/session.ts` refuses to boot in that mode by design, since the template ships
no real session reader.

This is patterned on a suite that resets a shared local Postgres and kills a port before it runs,
which makes it destructive locally and CI-only there. This one does neither: its database is a
throwaway directory this package owns (`functional-global-setup.config.ts` clears it before every
run), so it is exactly as safe on a laptop as it is in CI, and it runs inside `pnpm verify` rather
than being gated on `process.env.CI`.

**Adding a functional test:** one flow per file under `tests/*.func.ts`. Test through HTTP and UI
only, never by importing `apps/web` or another package's internals, so the suite keeps proving what
a real caller can observe rather than what the code happens to do internally.

## Conventions

- Targets and ports are fixed in `functional-env.ts` and `playwright.config.ts` rather than reused
  from `pnpm dev`, so a suite run never collides with a server a developer already has open.
- `noConsole` applies here like everywhere else: a failing assertion's message is the output, not a
  `console.log` on the way to one.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this package.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
