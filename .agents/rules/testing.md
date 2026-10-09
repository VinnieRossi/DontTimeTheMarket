---
description: Test conventions for every test file
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Testing conventions

- Write the failing test first, then the implementation. A test written afterward tends to
  describe what the code does rather than what was required of it.
- Name a test for the behavior it asserts, not for the function it calls. "returns a conflict
  when the title is already taken" survives a refactor; "calls the repository" does not.
- Assert observable behavior: the returned value, the persisted row, the message that was sent.
  An assertion on internal state breaks on a refactor that changed nothing a caller can see.
- Inject the clock, the identifier generator, and every provider. A test that waits on real time
  or real randomness is a test that fails on a slow machine for no reason.
- Database-backed tests use the in-process database, one per test, because a shared database
  makes results depend on the order tests happened to run in.
- Never skip, never mark only, never leave a placeholder. The gate blocks all three, because a
  skipped test counts as coverage of a case nobody ran.
