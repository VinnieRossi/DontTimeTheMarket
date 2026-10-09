# 2. No confirmation prompts in the agent permissions

## Status

Accepted.

## Context

The checked-in agent settings first asked for confirmation before a commit or a push. It looked
cautious. An agent working the repository unattended hit the prompt, and nobody was there: an
unanswered prompt stalls the run or is auto-denied.

The failure mode with a person present is not much better. A prompt somebody sees many times a day
gets approved without being read, which makes it no safer than an allowance while still costing the
attention it asked for.

## Decision

The permissions allow the everyday development commands, deny the handful that cannot be undone, and
ask about nothing.

What protects the repository runs whether or not anyone is watching: the commit-message hook rejects
a verification bypass, the pre-commit and pre-push hooks run the gate, the `PreToolUse` guard blocks
a force push, a hard reset, a recursive delete, and a push to the default branch before the command
executes, and branch protection requires the gate to pass before anything merges.

## Consequences

An agent can do ordinary work unattended, and the checks that matter still hold.

A team that does want a person at the commit boundary puts that rule in its own untracked local
settings, where it does not block every agent working the repository.
