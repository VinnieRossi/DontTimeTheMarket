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
- [ ] 4 Application: ui, hooks, queries
- [ ] 3 Feature: services
- [ ] 2 Infrastructure: contracts, providers, auth
- [ ] 1 Foundation: types, utils, logger, env, validation, database, theme

## Architecture

- [ ] Imports flow downward only, and any new package is registered in the dependency allowlist
- [ ] No type is restated that the schema already derives
- [ ] External input is parsed at the boundary by the schema that also produces its type
- [ ] Third-party services are reached through a port, with no vendor type or vendor error escaping it
- [ ] Permissions are enforced on the server, whatever the interface hides
- [ ] Visual values come from theme tokens
- [ ] No work can be dropped without a trace: anything that can fail is retried and then alerted on

## Database

- [ ] No schema change
- [ ] The schema changed, and its migration is committed in this change
- [ ] A destructive change is staged across releases rather than done in one step
- [ ] How to reverse it is written down

## Tests

- [ ] Unit tests cover the new behavior, including its failure paths
- [ ] Every new component has a story and a test
- [ ] Coverage thresholds still pass

## Driven

A green suite says the unit did what it was told. It does not say the feature works.

- [ ] I started the app and drove the changed flow the way a caller reaches it
- [ ] I drove the failure path, not only the success path
- [ ] I checked the console and the network for errors that never reached the screen

What I drove, and what happened:

## Anything a reviewer should look at first

