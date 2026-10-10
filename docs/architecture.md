# Architecture

Don't Time The Market is a game about the gap between what trading feels like and what it
returns.
A player gets a randomized slice of real market history with the dates and the price level
hidden, ten thousand dollars, and every lever a brokerage app would give them.
There are two ways to play: index mode trades the whole market as one line, and portfolio mode
has the player build a basket of real companies shown under generated names.
At the end the run is scored against the Bogle NPC: a benchmark that bought the same thing on day
one and then did nothing at all.

This note is what the rest of the repository routes back to.
It carries the layer table, the rules that are stricter than the layers alone, and the decisions
that shaped both.

## What this is

A monorepo built from the ai-quickstart template: strict TypeScript, a layered package graph, one
validation gate, agent governance, and a design system with a story and a test per component.

It installs, typechecks, lints, tests, builds, and builds Storybook on a fresh clone, with no
accounts, no secrets, no Docker, and no network access at runtime.
The market history it plays against is committed to the repository rather than fetched.

## The shape of the thing

The whole game is one pure function.

```
startRun(seed, runLength)                        -> an index run's opening state
startPortfolioRun(seed, runLength, allocations)  -> a portfolio run's opening state
step(state, action)                              -> the next state, for either
```

`step` reads no clock, no environment, and no random source.
Every random draw it needs (where in history a run opens, which commentary line to show) advances
a counter carried in the state itself, so the same seed and the same action sequence always
produce the same run, down to the last cent.
That is what makes a score verifiable by replay rather than by trust, and it is the one property
every other decision here protects.

The clock lives outside the engine, in `useGame`, which dispatches a `TICK` on an interval the
player controls.
The engine never schedules anything.

## Data flow

```
baked market history (committed JSON: the index series, and the company roster on demand)
    -> engine: step(state, action), a pure reducer over a seeded state
    -> hook: holds the state, owns the clock, dispatches actions
    -> view mapping: a run becomes formatted strings and decided states
    -> components: props in, callbacks out, no knowledge of the simulation
    -> page: composition only
```

Actions flow back up the same path.
A tap on Buy becomes a parsed trade, which becomes a pending order, which fills on the next
simulated day at that day's price and never at the price that was on screen when it was placed.

## Domains

One: a run.
There is no second one, and there is no server-side domain at all, which is why this repository
has no database, no API contract, and no backend packages.
See `docs/adr/0003-no-server-side-domain.md`.

## Layers

Imports flow downward only, and the check that enforces it runs in the gate.

| Layer | Packages | May import |
|---|---|---|
| 5 Apps | `apps/web` | everything below |
| 4 Application | `@dttm/ui`, `@dttm/hooks` | see the within-layer rules |
| 3 Feature | `@dttm/engine` | types, utils |
| 1 Foundation | `@dttm/config`, `@dttm/types`, `@dttm/utils`, `@dttm/validation`, `@dttm/theme` | validation may import types |

There is no Infrastructure band, because nothing in this project reaches outside itself: there is
no vendor to put behind a port and no environment to read.

Two rules are stricter than the band numbering alone implies, and each is enforced by
`pnpm validate:architecture` rather than by review:

- `@dttm/ui` may import `@dttm/theme`, `@dttm/types`, `@dttm/utils`, and `@dttm/validation` only.
  It may not import `@dttm/engine` or `@dttm/hooks`, even though ui and hooks sit in the same
  band, because a component that reaches into the simulation cannot be rendered from props alone
  and so cannot be rendered in a story.
  Validation is the exception it may reach for, because a form and the rule its input has to
  satisfy are the same rule, and writing it twice is how the two come to disagree.
- `@dttm/engine` names no frontend package at all.
  The simulation has to run with no screen attached for a replay to verify a score.

A new package MUST be registered in `scripts/package-graph.ts` before it can depend on anything,
because an unregistered package is a package nobody reviewed.

## Single source of truth

The engine owns the model of a run.
`RunState` is defined once, in `@dttm/engine`, and every rule about what a run is, costs, or
scores lives beside it.
It is a union of two shapes, an index run and a portfolio run, discriminated by `mode`; one
`step` takes either, and every rule both of them obey lives in a module that knows about neither.
See `docs/adr/0006-portfolio-mode-as-a-second-run-shape.md`.
Nothing downstream restates it: the view mapping in `apps/web` turns a state into strings, and
the components take the strings.

The presentation layer declares its own view types (`ChartSeriesView`, `FigureView`, and the
rest) rather than importing the engine's.
That is a deliberate second shape, and it is the only one: it is what keeps a component
renderable from a story, and the compiler catches drift between the two at the one place they
meet, which is the mapping in the app.

## Where a rule lives

- A rule about what a run costs or scores is in `@dttm/engine`, and it is tested there.
- A rule about what a player may type is a schema in `@dttm/validation`, and the form and the
  order both parse with it.
- A decision about what something looks like is a token in `@dttm/theme`.
  Components resolve tokens through class names; the one component that cannot is the chart,
  because a canvas takes a color string rather than reading a stylesheet, so it reads the tokens
  it needs at runtime.
- Copy that changes with the state of a run is written in the view mapping, beside the decision
  that chooses it.

## The gate

One command runs every check: `pnpm verify`.
Pre-commit runs its staged subset, pre-push runs it whole, and CI runs the same command on a
clean checkout.
There is one definition of passing, so "green locally" and "green in CI" mean the same thing.

Visual regression is the one check outside it: a screenshot diff is platform-specific, so it runs
as its own CI job against baselines captured on that job's runner.
`apps/e2e/AGENTS.md` says how a diff there gets resolved.

### Why the agent permissions have no confirmation list

The checked-in agent settings allow the everyday development commands, deny the handful that
cannot be undone, and ask about nothing.
See `docs/adr/0002-no-confirmation-prompts-in-the-agent-permissions.md` for the argument.

## Known gaps

- **No persistence.** A run exists while the tab is open and is gone when it closes. Scores are
  not saved anywhere, which is also why the game says so on its own opening screen.
- **No error tracking.** Nothing here reports an unhandled exception anywhere; add Sentry or an
  equivalent once there is a production deployment to watch.
- **Branch protection.** The CI workflow runs on every pull request, but nothing in this
  repository can require it to pass before a merge; configure that in the repository settings.
- **Scoring has one benchmark.** The win condition and the annualized edge compare only to the
  Bogle NPC. The S&P 500, Nasdaq-100, and Berkshire NPCs in `external-npcs.ts` show for
  comparison wherever a run's start day falls within their own real history. Each is priced off
  its own series rather than the game's internal index, so adding one took a state field and
  reducer changes, not just a list entry the way a second benchmark on the internal index would.
- **A survivors-only roster.** Portfolio mode can only offer companies that are still listed,
  because no free source of daily history serves the ones that went to zero. The builder says so
  rather than hiding it.
