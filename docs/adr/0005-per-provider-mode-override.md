# 5. A per-provider override on top of the global provider mode

## Status

Accepted.

## Context

`PROVIDER_MODE` was a single global switch: `mock` for the whole application, or `live` for the
whole application, with boot refusing to build any capability that had no real adapter yet.

A project built against the template incrementally in practice. One capability, such as payments,
had a real adapter wired and credentials in hand. Another, such as SMS, did not yet. With only a
global switch, there was no setting that ran the first live and the second mocked at the same time:
flipping the switch to `live` broke the capability that was not ready, and leaving it at `mock` gave
up the one that was.

The refusal rule itself was never the problem. A fake standing in for a real provider without
anyone deciding that on purpose is exactly the silent loss `live` mode exists to catch. The problem
was the switch's granularity: the whole application shared one setting when the actual progress of
an integration is per capability.

## Decision

`PROVIDER_MODE` stays the global default. Each external provider gains its own optional
`<NAME>_PROVIDER_MODE` override, `mock` or `live`, validated by the same env schema. Unset, a
provider inherits the global default; set, the override wins regardless of what the global default
says. Today that is `MAIL_PROVIDER_MODE`; a new provider adds one env key and one line in the
factory's resolution map.

Nothing changes about what `live` requires: a provider resolved to `live`, whether by the global
default or its own override, still needs a real adapter or boot refuses, naming that provider. The
queue stays outside this switch entirely, unchanged from before.

A production guard applies specifically to inheritance. A provider may run mocked in production
only when its own override says so explicitly. One resolved to `mock` purely by inheriting a mocked
global default in production fails boot instead, naming the provider, because an operator reading
`PROVIDER_MODE=live` in a deploy's configuration has no reason to suspect one particular capability
was still fake. When a provider is mocked in production on purpose, boot logs one warning naming
every provider running mocked, and the health endpoint's `mockedProviders` field reports the same
list, so the fact stays visible rather than living only in configuration nobody is reading at the
moment it matters.

## Consequences

A project ships incrementally: payments live, SMS still mocked, with one setting each rather than
one shared setting fighting both. The refusal rule from the first version of the template holds
exactly as before for whichever provider is live, and now also for a provider mocked in production
only by accident of inheritance.

Every new provider repeats the same two-part shape: an optional override key in the env schema, and
one entry in the factory's provider mode map. Neither the queue's exemption nor the existing
live-without-an-adapter refusal changed to make room for this.
