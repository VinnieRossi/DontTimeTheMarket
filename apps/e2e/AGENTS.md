# @dttm/e2e

Playwright, two intentionally separate tracks. It imports no other `@dttm/*` package: both suites
reach their target over the UI only, so a change here never has an internal shortcut to take.

## Visual regression (`playwright.config.ts`, `*.visual.ts`)

Two projects, both on Chromium: a desktop window at 1280 and a phone at 390, which is the
narrowest width the design targets. A second browser engine would be a second set of baselines to
keep, and what is checked here is the layout rather than one vendor's rendering of it.

`tests/app.visual.ts` covers the screens the app renders from its own code, which is the opening
screen and only that: a run opens on a seeded random slice of history and then advances on a
timer, so no two app-level screenshots of a game in progress would agree. The running game, the
scoreboard, and every sheet are covered by `tests/storybook.visual.ts`, which screenshots every
story from the built story index rather than a hand-kept list, at both widths, from fixed props.
A new story gets a baseline the first time someone runs `test:visual:update` after adding it.

Not part of `pnpm verify`: a screenshot diff is platform-specific, so it runs as its own CI job.
Baselines are captured on that job's exact Linux runner, not on a contributor's own machine.
Update them by running the "Update visual baselines" GitHub Actions workflow (`workflow_dispatch`)
against your branch, which runs `test:visual:update` on that runner and commits the result;
running `pnpm test:visual:update` locally works for a quick check but its output should not be the
one you commit, because a different operating system renders text with different antialiasing.

**Adding a visual test:** a new app screen goes in the `SCREENS` list in `tests/app.visual.ts`,
and only if it renders the same thing every time. A new story needs nothing added here at all.

**A sheet in a story:** the sheets are fixed-position overlays, so a story that renders one gives
it a full-height wrapper to open over. Without it the page has no height and the screenshot has
nothing to measure.

## Functional e2e (`playwright.func.config.ts`, `*.func.ts`)

One real flow per file, driven through the UI the way a player drives it. `game.func.ts` opens a
run, stops the clock, buys, watches the order fill on the following day, runs the market until a
score is allowed, cashes out, and starts again. `indicators.func.ts` piles readouts onto the chart
and checks that the screen reports how cluttered it has become.

Runs against `next dev` on a port of its own. There is nothing to reset between runs: the game is
a deterministic simulation in the browser over data committed to this repository, so it has no
database, no service to start, and no environment to configure. That is why it sits inside
`pnpm verify` rather than being gated on `process.env.CI`.

**Adding a functional test:** one flow per file under `tests/*.func.ts`. Test through the UI only,
never by importing a package's internals, so the suite keeps proving what a player can observe.

**Waiting for the market:** drive the clock through the speed controls or the Step button rather
than a fixed sleep. A run only becomes scorable after a minimum number of simulated days, and the
button that unlocks then is the thing to wait on.

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
