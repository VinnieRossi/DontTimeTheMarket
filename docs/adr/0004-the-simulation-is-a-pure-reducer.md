# 4. The simulation is a pure reducer

## Status

Accepted.

## Context

The game has to be fair, and it has to be able to prove it. A player gets a randomized slice of
real history, trades it, and is scored against a benchmark. If the slice, the fills, or the score
depended on wall-clock time, on `Math.random`, or on anything else a later run could not
reproduce, then a score would be a number nobody could check, and a leaderboard later would be a
list of claims.

The simulation also has to run on a timer, at four speeds a player picks, which is exactly the
kind of requirement that leads to an engine owning an interval and reading the clock.

## Decision

The engine is one pure function, `step(state, action)`, plus `startRun(seed, runLength)` to open a
run. It reads no clock, no environment, and no random source. Every random draw it needs, which is
where in history a run opens and which commentary line shows, advances a counter stored in the
state itself.

The clock lives outside, in `useGame`, which dispatches a tick on an interval. Drawing the seed for
a new run is the one place anything reaches for real entropy, and it happens in that hook rather
than in the engine.

## Consequences

The same seed and the same action sequence produce the same run, cent for cent, so a score can be
verified by replaying it rather than by trusting the client that reported it. That is what makes
the leaderboard this game does not have yet possible later.

The engine is testable without a renderer, a timer, or a fake: its whole test suite is values in
and values out, and a failing case is reproducible from the seed the test names.

The cost is discipline. Anything that wants the time, a random number, or an outside reading has
to take it as part of an action or as part of the baked data, and an agent that adds one inside
the engine breaks the property quietly. `AGENTS.md` states the rule, and the tests assert
determinism directly so a violation fails rather than drifts.
