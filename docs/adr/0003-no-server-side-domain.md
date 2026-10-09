# 3. No server-side domain

## Status

Accepted.

## Context

This project is built from the ai-quickstart template, which ships a full server stack: an
in-process Postgres with migrations, a typed API contract, a provider factory with a live adapter
and a fake for every port, a role and permission layer, a service layer, and a durable job
pipeline. One example feature, a note, runs through all of it, and the template says to delete
that example once a real feature exists.

Don't Time The Market has no server-side domain to replace it with. The game is a deterministic
simulation that runs entirely in the browser against market history committed to this repository.
Nothing is stored, nothing is fetched, nobody signs in, and no work outlives a request, because
there are no requests. The release this port is based on shipped exactly that, and persistence,
accounts, and a leaderboard are explicitly out of scope.

So the choice was between keeping the server stack with no domain inside it, or removing it.

## Decision

The backend packages are removed: `@app/database`, `@app/providers`, `@app/auth`,
`@app/services`, the API contract in `@app/contracts`, the client layer in `@app/queries`, and the
server wiring in `apps/web` that connected them. The environment and logger packages go with them,
because with no server there is nothing to configure and nothing to log that a browser console
does not already show. The architecture note's Infrastructure band is gone for the same reason:
nothing in this project reaches outside itself.

What the template is actually for is kept whole: the layered package graph, the dependency
allowlist, the one gate and its five validators, the coverage thresholds, the commit and push
hooks, the agent instruction layer, the design system with a story and a test per component, and
both Playwright suites.

## Consequences

The repository describes what this project is. An agent reading it finds one architecture rather
than a real one beside a dormant one, which is the failure the template's own note warns about
when it says the example feature should never become a second architecture to maintain.

Adding a server later is a real piece of work rather than filling in a blank: the packages would
come back from the template, and the layer table and the allowlist would gain an Infrastructure
band again. That cost is accepted, because scaffolding nobody exercises rots faster than it would
take to reintroduce, and a fake adapter that no test ever runs is a claim rather than a check.

The gate loses nothing. Every validator, threshold, and hook still runs, and `pnpm verify`
contains the same steps minus the database migration check that had no schema to check.
