# Agent instructions

This file is the canonical instruction file. `CLAUDE.md` is a symlink to it, so there is one file
to keep current rather than two copies that drift.

Guidance that applies to one part of the repository lives under the agent rules directory and
loads by the paths it governs, so a package does not carry its own instruction file for a rule
this file or that directory already states. `apps/e2e/AGENTS.md` is the one exception: Playwright's
own conventions (which suite covers what, how a baseline gets updated) are specific enough to that
package that repeating them here would either bloat this file past its budget or go stale unread.
The architecture these rules derive from is written up under `docs/`, and the decisions behind it
in `docs/adr/`.

## What this is

A game about the gap between what trading feels like and what it returns. A player gets a
randomized slice of real market history with the dates and the price level hidden, and is scored
at the end against a benchmark that bought the index on day one and then did nothing.

The whole simulation is one pure function: `step(state, action)` reads no clock, no environment,
and no random source, and every draw it needs advances a counter carried in the state. The same
seed and the same actions always produce the same run. Protect that property before anything else.

## Package responsibilities

- Config: TypeScript bases, lint rules, coverage thresholds.
- Types: the error hierarchy and the Result type. No dependencies of its own.
- Utils: pure helpers, including the formatters every screen renders through.
- Validation: the schemas a player's input is parsed by, shared by the form and the order.
- Engine: the simulation, the baked market history, and every rule about what a run costs or
  scores. Pure, deterministic, and free of React.
- Theme: design tokens. The only place a raw visual value is allowed.
- UI: stateless components, organized by composition level, each with a story and a test.
- Hooks: the React integration over the engine, and the clock that drives it.
- Web: routing, composition, and the mapping from a run to what the screens render.

## Dependency rules

- A package MUST NOT import from its own layer or any layer above it, because an upward import
  creates a cycle and neither end can then be tested or replaced on its own.
- The UI package MUST import only types, theme, utils, and validation. It MUST NOT import the
  engine or the hooks, because a component that reaches into the simulation cannot be rendered
  from props alone, and the story is what proves it can.
- The engine MUST NOT import a frontend package, because the simulation has to run with no screen
  attached for a replay to verify a score.
- A new package MUST be registered in the dependency allowlist before it can depend on anything,
  because an unregistered package is a package nobody reviewed.

## Code patterns

- `step` MUST stay pure. No clock, no `Math.random`, no IO, no logging: a run that cannot be
  replayed from its seed is a score nobody can check.
- A rule about what a run costs or scores MUST live in the engine, not in a component and not in
  the view mapping, because a rule the screen owns is a rule the tests cannot reach.
- Every external input MUST be parsed at the boundary by a schema that also produces the type used
  downstream, because a separate type and validator drift and the drift is invisible until
  malformed input reaches code that trusted the type.
- An operation that fails as part of its normal contract SHOULD return a Result rather than throw,
  because a thrown error there is a control-flow path the type checker cannot see.
- Visual values MUST come from theme tokens, because a literal color or spacing value cannot be
  changed in one place. The chart is the one component that reads a token at runtime, because a
  canvas takes a color string rather than a class.
- A component MUST take what it renders as props and report what happened through callbacks.
  Formatting a figure, deciding a state, and choosing copy belong in the view mapping.

## Anti-patterns

- DO NOT use the `any` type. Say `unknown` and narrow it.
- DO NOT suppress a validator. Suppression comments, skipped tests, and deferred-work markers are
  blocked by the gate, because a silenced rule is a rule that stopped applying with nothing
  reporting that it did.
- DO NOT put a game rule, a format, or a component implementation in the app. Apps compose.
- DO NOT read the clock or draw a random number inside the engine.
- DO NOT write a long dash anywhere, and use American spelling throughout. The gate checks both.
- DO NOT bypass the gate. A failing gate means the code is wrong or the rule is wrong, so fix the
  cause.

## Testing

- Every exported engine function MUST have a unit test, because the engine is where the rules live
  and an untested rule is an assumption.
- Every exported component MUST have a story and a test, because a component that cannot render
  from props alone has a hidden dependency and the story is what surfaces it.
- Tests MUST assert observable behavior rather than internal state, because a test bound to the
  implementation breaks on a refactor that changed nothing a caller can see.
- A test that opens a run MUST name its seed, because a failure on a seed nobody wrote down cannot
  be reproduced.

## Commits

- Conventional commits with a package scope, because the history is then greppable by package.
- Never `--no-verify`, and never a skip-ci marker. The commit-message hook rejects both.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
