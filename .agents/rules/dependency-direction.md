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
| 4 Application | ui, hooks, queries |
| 3 Feature | services |
| 2 Infrastructure | contracts, providers, auth |
| 1 Foundation | types, utils, logger, env, validation, database, theme |

Three rules are stricter than the table alone implies:

- The UI package MAY import types, theme, and utils, and nothing else. It MUST NOT import hooks
  or queries, because a component that reaches for its own data cannot be rendered from props.
- The queries package MUST NOT import services. Application code reaches business logic only
  through the API contract.
- Within Foundation, only validation may import database, and only to derive schemas from it.

A new package MUST be registered in the dependency allowlist before it may depend on anything,
because an unregistered package is a package nobody reviewed. The architecture validator in the
gate enforces every rule on this page, so a violation blocks the commit rather than waiting for
a reviewer to notice.
