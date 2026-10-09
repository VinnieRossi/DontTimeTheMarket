# 1. One gate, invoked identically everywhere

## Status

Accepted.

## Context

A repository usually grows several entry points that are supposed to run the same checks: a
pre-commit hook, a pre-push hook, a CI workflow, and whatever a person types. They drift the first
time somebody adds a check to one of them, and "passing locally" quietly stops meaning "passing in
CI".

## Decision

One command, `pnpm verify`, runs every check. Pre-commit runs its staged subset, pre-push runs it
whole, and CI runs the same command. A new check is added in one file and every caller gets it.

The gate runs the linter, five repository validators, the typecheck, the tests with their coverage
thresholds, the app build, the Storybook build, and the functional Playwright suite. Visual
regression stays out of it: a screenshot diff is platform-specific, so it runs as its own CI job
instead (see `apps/e2e/AGENTS.md`).

## Consequences

There is one definition of passing, and a failure means the same thing wherever it appeared.

The full gate is slower than a bare lint, which is why pre-commit runs a subset: the fast checks on
staged files, where the feedback is worth the wait, and everything else at push.

Nothing may bypass it. `--no-verify` is blocked by the commit-message hook and by the `PreToolUse`
guard, because a commit that cannot pass is information rather than an obstacle.
