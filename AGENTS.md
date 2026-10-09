# Agent instructions

This file is the canonical instruction file. `CLAUDE.md` is a symlink to it, so there is one file to keep current rather than two copies that drift.

Guidance that applies to one part of the repository lives under the agent rules directory and loads by the paths it governs, so a package does not carry its own instruction file for a rule this file or that directory already states. `apps/e2e/AGENTS.md` is the one exception: Playwright's own conventions (which suite covers what, how a baseline gets updated) are specific enough to that package that repeating them here would either bloat this file past its budget or go stale unread. The architecture these rules derive from is written up under `docs/`, and the decisions behind it in `docs/adr/`.

## Architecture overview

A monorepo split between apps and packages. Apps hold entry points: routing, composition, and framework wiring, all of it thin. Packages hold definitions: the schema, the contract, business logic, and presentation components, each testable without starting the app.

Dependencies flow in one direction through five layers, from the app down to the foundation. The backend and the frontend never import each other; they meet only at the typed API contract. `docs/architecture.md` carries the layer table and the three rules that are stricter than the layer numbering alone implies.

One example feature, a note, runs through every layer. It exists as the pattern new work copies, so read it before adding a feature rather than inventing a second shape.

## Package responsibilities

- Types: the error hierarchy and the Result type. No dependencies of its own.
- Utils: pure helpers. No internal dependencies.
- Logger: the one logger. Every field it writes passes redaction.
- Env: the environment schema, parsed once at boot.
- Database: the schema source of truth, its migrations, and the clients that run them.
- Validation: input schemas shared by the API boundary and the forms that feed it.
- Contracts: the API contract, the provider port interfaces, and the job contract.
- Providers: a live adapter and an in-process fake for every port, plus the factory that selects between them.
- Auth: the role hierarchy, the permission checks, and the session port.
- Services: business logic and the durable job pipeline.
- Theme: design tokens. The only place a raw visual value is allowed.
- UI: stateless components, organized by composition level, each with a story and a test.
- Queries: typed client calls against the contract. No React.
- Hooks: React integration wrapping those queries.
- Web: routing and composition only.

## Dependency rules

- A package MUST NOT import from its own layer or any layer above it, because an upward import creates a cycle and neither end can then be tested or replaced on its own.
- The UI package MUST import only types, theme, and utils. It MUST NOT import hooks or queries, because a component that reaches for data cannot be rendered from props alone.
- The queries package MUST NOT import services. Application code reaches business logic only through the contract, because the frontend calls an API rather than invoking a service function.
- A new package MUST be registered in the dependency allowlist before it can depend on anything, because an unregistered package is a package nobody reviewed.

## Code patterns

- Types MUST derive from the schema rather than being restated, because a hand-written copy disagrees with its source eventually and nothing reports which one is stale.
- Every external service MUST sit behind a port this repository owns, with a fake alongside the live adapter, because a direct vendor call cannot be swapped, tested offline, or replaced without rewriting business logic.
- Providers MUST be injected rather than imported at the point of use, because a module-level instance is one no test can substitute.
- Provider errors MUST be normalized into this repository's own error types at the boundary, because a vendor error shape leaking inward makes every caller depend on that vendor.
- Every external input MUST be parsed at the boundary by a schema that also produces the type used downstream, because a separate type and validator drift and the drift is invisible until malformed input reaches code that trusted the type.
- An operation that fails as part of its normal contract SHOULD return a Result rather than throw, because a thrown error there is a control-flow path the type checker cannot see.
- Log lines MUST go through the logger, because a direct console write has no level, no context, and no redaction.
- Visual values MUST come from theme tokens, because a literal color or spacing value cannot be changed in one place.
- Every pipeline step MUST be retried with backoff and dead-lettered with an alert when its retries run out, because work that fails silently is work nobody knows to redo.
- Permission checks MUST be enforced on the server regardless of what the interface hides, because hiding a control removes the button and not the endpoint.

## Anti-patterns

- DO NOT use the `any` type. Say `unknown` and narrow it.
- DO NOT suppress a validator. Suppression comments, skipped tests, and deferred-work markers are blocked by the gate, because a silenced rule is a rule that stopped applying with nothing reporting that it did.
- DO NOT put business logic, data access, or component implementation in the app. Apps compose.
- DO NOT call a vendor SDK from business logic. Go through its port.
- DO NOT hand-write a type the schema already derives.
- DO NOT read the process environment outside the env package.
- DO NOT write a long dash anywhere, and use American spelling throughout. The gate checks both.
- DO NOT bypass the gate. A failing gate means the code is wrong or the rule is wrong, so fix the cause.

## Testing

- Every exported service function MUST have a unit test, because a service is where the rules live and an untested rule is an assumption.
- Every exported component MUST have a story and a test, because a component that cannot render from props alone has a hidden dependency and the story is what surfaces it.
- Database-backed tests MUST run against the in-process database rather than a shared one, because a shared database makes tests order-dependent.
- Tests MUST assert observable behavior rather than internal state, because a test bound to the implementation breaks on a refactor that changed nothing a caller can see.

## Commits

- Conventional commits with a package scope, because the history is then greppable by package.
- Never `--no-verify`, and never a skip-ci marker. The commit-message hook rejects both.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
