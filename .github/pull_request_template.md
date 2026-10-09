# Summary

What this change does, and why. One paragraph.

## Type of change

- [ ] Feature
- [ ] Fix
- [ ] Refactor, with no change in behavior
- [ ] Performance
- [ ] Security
- [ ] Documentation
- [ ] Tooling, CI, or dependencies

## Layers touched

- [ ] 5 Apps: the web app
- [ ] 4 Application: ui, hooks
- [ ] 3 Feature: engine
- [ ] 1 Foundation: config, types, utils, validation, theme

## Architecture

- [ ] Imports flow downward only, and any new package is registered in the dependency allowlist
- [ ] No rule about what a run costs or scores lives outside the engine
- [ ] External input is parsed at the boundary by the schema that also produces its type
- [ ] Visual values come from theme tokens
- [ ] A component takes what it renders as props and reports what happened through callbacks

## Determinism

- [ ] The engine still reads no clock, no environment, and no random source
- [ ] Any new randomness advances the counter carried in the state
- [ ] A test that opens a run names its seed
- [ ] The baked market data is unchanged, or it was rebaked and the change is explained

## Tests

- [ ] Unit tests cover the new behavior, including its failure paths
- [ ] Every new component has a story, a test, and a row in the accessibility table
- [ ] Visual baselines are regenerated on the runner if the change was meant to be visible
- [ ] Coverage thresholds still pass

## Driven

A green suite says the unit did what it was told. It does not say the feature works.

- [ ] I started the app and drove the changed flow the way a caller reaches it
- [ ] I drove the failure path, not only the success path
- [ ] I checked the console and the network for errors that never reached the screen

What I drove, and what happened:

## Anything a reviewer should look at first

