---
description: Conventions for provider adapters and their fakes
globs:
  - "packages/backend/providers/**"
---

# Providers

- The interface comes first and describes what this application needs, not what a vendor offers.
  An interface shaped like one vendor's API is a wrapper for that vendor, not an abstraction.
- Every port has a live adapter and an in-process fake, and both satisfy the same interface. The
  fake is what lets the whole application run with no accounts and what makes tests offline.
- A vendor type MUST NOT appear in any signature the interface exposes, because a leaked vendor
  type makes every caller depend on that vendor's package.
- A vendor error MUST be normalized into this repository's own error type at the adapter
  boundary, with the original kept as the cause so the trail survives.
- Selection is configuration. A missing credential or a capability with no real adapter in live mode fails at boot rather than
  falling back to a fake, because a fake in production is a system that silently drops work.
- `PROVIDER_MODE` is the global default, and each provider has its own optional `<NAME>_PROVIDER_MODE` override that takes
  precedence over it, because an incremental build needs to run one capability live while another is still mocked. In
  production, a provider MUST NOT run mocked by inheriting the global default; it may run mocked only when its own override
  says so explicitly, and boot then warns and the health endpoint reports it, because a mock standing in during production
  is only ever acceptable on purpose.
- Adapters are the only place a try/catch around a vendor call belongs. Callers branch on the
  returned Result instead.
