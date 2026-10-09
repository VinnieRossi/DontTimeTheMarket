---
description: Internal imports flow down through the layers only, with no cycles
alwaysApply: true
---

# Dependency direction

Internal imports flow downward. A package MAY import a lower layer, MUST NOT import its own
layer or a higher one, and MUST NOT form a cycle, because an upward import means neither end
can be built, tested, or replaced on its own.

| Layer | Packages |
|---|---|
| 5 Apps | the web app |
| 4 Application | ui, hooks |
| 3 Feature | engine |
| 1 Foundation | config, types, utils, validation, theme |

There is no Infrastructure band, because nothing here reaches outside itself: no vendor to put
behind a port, no database, and no environment to read. See `docs/adr/0003-no-server-side-domain.md`.

Two rules are stricter than the table alone implies:

- The ui package MAY import theme, types, utils, and validation, and nothing else. It MUST NOT
  import the engine or the hooks, because a component that reaches into the simulation cannot be
  rendered from props alone. Validation is the one it may reach for: a form and the rule its
  input has to satisfy are the same rule, and writing it twice is how the two come to disagree.
- The engine MUST NOT import a frontend package, because the simulation has to run with no screen
  attached for a replay to verify a score.

A new package MUST be registered in the dependency allowlist before it may depend on anything,
because an unregistered package is a package nobody reviewed. The architecture validator in the
gate enforces every rule on this page, so a violation blocks the commit rather than waiting for
a reviewer to notice.
