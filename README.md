# Don't Time The Market

A game about the gap between what trading feels like and what it returns.

You get a randomized slice of real market history with the calendar dates and the price level
hidden, ten thousand dollars, and every lever a brokerage app would give you: market orders, limit
orders, stop-losses, moving averages, RSI, MACD, the yield curve, and the money supply, if you
want it.
Play index mode against the whole market as one line, or portfolio mode, which has you build a
basket of real companies shown under generated names.

At the end you are scored against the Bogle NPC, a benchmark that bought the same thing on day one
and then did nothing at all.
Most runs lose to it.
That is the joke, and it is also the point.
Wherever a run's dates overlap their own real history, you also see how the S&P 500, the
Nasdaq-100, and Berkshire Hathaway did over the same stretch, for comparison; none of them affect
the score.

## Running it

```
pnpm install
pnpm dev
```

The app is at `http://localhost:3000`. Nothing else is needed: no account, no key, no database, no
Docker. The market history it plays against is committed to this repository.

### What you need installed

Node and pnpm, at the versions in `.nvmrc` and `package.json`.

## The commands

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the app at `http://localhost:3000` |
| `pnpm verify` | The gate: lint, the validators, typecheck, tests with coverage, both builds, functional e2e |
| `pnpm test` | Every test suite |
| `pnpm typecheck` | Every package |
| `pnpm lint` / `pnpm lint:fix` | Lint and format |
| `pnpm storybook` | The design system at `http://localhost:6006` |
| `pnpm validate` | The repository validators on their own, which is the fast subset |
| `pnpm test:e2e` | The functional Playwright suite: real flows through a run |
| `pnpm test:visual` | Visual regression against the app and every story, at desktop and phone width |
| `pnpm test:visual:update` | Regenerates the committed baselines after an intentional visual change |
| `pnpm bake-data` | Refetches the market history from FRED and rewrites the committed data |
| `pnpm bake-stocks` | Refetches the portfolio mode company roster and rewrites the committed data |
| `pnpm bake-npc-series` | Refetches the S&P 500, Nasdaq-100, and Berkshire benchmark NPC series and rewrites the committed data |

## What is in here

```
apps/web                      the app: routing, composition, and the mapping from a run to a screen
apps/e2e                      Playwright: visual regression and the functional flows
packages/shared/config        TypeScript bases, lint rules, coverage thresholds
packages/shared/types         the error hierarchy and the Result type
packages/shared/utils         pure helpers, including every formatter a screen renders through
packages/shared/validation    the schemas a player's input is parsed by
packages/shared/engine        the simulation, its rules, and the baked market history
packages/frontend/theme       design tokens and the two typefaces
packages/frontend/ui          stateless components, each with a story and a test
packages/frontend/hooks       the React integration over the engine, and the clock
scripts                       the gate, the repository validators, and the data bake
.agents, .claude              the instruction layer: rules, subagents, hooks
```

`docs/architecture.md` has the layer table and the rules that are stricter than the layers alone.

## The engine

The whole simulation is one pure function:

```ts
const state = startRun(seed, 'standard')
const next = step(state, { type: 'TICK' })
```

`step` reads no clock, no environment, and no random source. Every draw it needs advances a
counter carried in the state, so the same seed and the same actions always produce the same run.
That is what would let a score be verified by replay rather than trusted, and it is the property
every other decision in this repository protects.

The clock lives outside it, in `useGame`, which dispatches a tick on an interval the player
controls.

## The data

Daily Nasdaq Composite closes back to 1971, plus CPI, unemployment, the Fed funds rate, M2, the
VIX, and three Treasury rates, all from FRED's public CSV endpoint, aligned onto one daily index
and committed under `packages/shared/engine/data/baked/`.

Nothing at runtime contacts FRED. Refresh the data with `pnpm bake-data` and commit the result,
which is also the only thing that changes what a given seed plays.

The dividend yield is the one figure that is not fetched: FRED has no free, no-key, per-day
dividend series for the index, so the engine applies a flat, disclosed annual yield instead. The
volume readout is synthetic and labeled as such, because the baked series is close-only.

The S&P 500, Nasdaq-100, and Berkshire benchmark NPCs are priced off their own real daily history
instead of the game's index: SPY, QQQ, and BRK.A closes and dividends from Yahoo Finance, aligned
onto the same daily grid and committed the same way.
Nothing at runtime contacts Yahoo either.
Refresh them with `pnpm bake-npc-series`.
A run that opens before one of them has its own first real print simply does not show that NPC.

Portfolio mode plays against a roster of real companies, baked the same way from three sources:
daily closes and dividend events from Yahoo Finance's unofficial chart endpoint, fundamentals from
SEC EDGAR's XBRL API, and the company and sector list from Wikipedia's "List of S&P 500 companies."
Nothing at runtime contacts any of them either.
Refresh the roster with `pnpm bake-stocks`.
Every free source of per-company history serves only companies still listed today, so the roster
is a survivors-only sample, and the builder screen says so.
See `docs/adr/0006-portfolio-mode-as-a-second-run-shape.md` for the design behind it.

## The gate

One command runs every check, and the same command runs everywhere: pre-commit runs its staged
subset, pre-push runs it whole, and CI runs it on a clean checkout. There is one definition of
passing.

Five validators run inside it, each because a rule that nothing checks is a suggestion:

- the dependency allowlist, which fails an import that flows the wrong way and a package nobody
  registered
- file size limits, so an orchestration file that is growing gets split rather than skimmed
- a suppression scanner, which blocks the escape hatches an agent reaches for when it cannot make
  something pass
- a writing check for long dashes and British spellings
- instruction-file governance: the root file stays inside its length budget, indexes the package
  files, and the tool-specific names stay symlinks to it

Never bypass it. A blocked commit means the code is wrong or the rule is wrong, and both are fixed
upstream of the bypass.

## Playwright

`apps/e2e` runs two suites. Visual regression compares the opening screen and every Storybook
story against committed PNG baselines at 1280 and at 390 pixels wide; it is not part of the gate
because a screenshot diff is platform-specific, and runs as its own CI job instead. The functional
suite drives real flows through a run and is part of `pnpm verify` like everything else.
`apps/e2e/AGENTS.md` says how to add a test to either one and how to update a baseline.

## Known gaps

- **No persistence.** A run lives in the tab and is gone when it closes. Nothing is saved
  anywhere, and the opening screen says so.
- **Error tracking.** Nothing here reports an unhandled exception anywhere; add Sentry or an
  equivalent once there is a production deployment to watch.
- **Branch protection.** The CI workflow runs on every pull request, but nothing in this
  repository can require it to pass before a merge; configure that in the repository settings.
- **Scoring has one benchmark.** Both modes score against the Bogle NPC alone. The S&P 500,
  Nasdaq-100, and Berkshire NPCs show for comparison when a run's dates overlap their own history,
  but do not affect the score.
- **A survivors-only roster.** Portfolio mode can only offer companies that are still listed, and
  the builder says so rather than hiding it.
