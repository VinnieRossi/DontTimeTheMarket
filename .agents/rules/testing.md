---
description: Test conventions for every test file
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---

# Testing conventions

- Write the failing test first, then the implementation. A test written afterward tends to
  describe what the code does rather than what was required of it.
- Name a test for the behavior it asserts, not for the function it calls. "fills a market order on
  the next day rather than at the price on screen" survives a refactor; "calls executeBuy" does
  not.
- Assert observable behavior: the returned state, the figure on the screen, the order that
  filled. An assertion on internal state breaks on a refactor that changed nothing a caller can
  see.
- A test that opens a run MUST name its seed. The engine is deterministic, so a named seed makes
  a failure reproducible forever; a seed nobody wrote down makes it a story.
- Never reach for the clock or a random number in a test. The engine takes a tick as an action,
  and the hook's interval is driven with fake timers.
- Never skip, never mark only, never leave a placeholder. The gate blocks all three, because a
  skipped test counts as coverage of a case nobody ran.
