/**
 * The dependency allowlist. Every internal package is named here with exactly the internal
 * packages it may depend on, and a package that is not named here fails the check.
 *
 * An allowlist rather than a blocklist, because a blocklist only catches the violations
 * somebody already thought of, while an allowlist also catches a package added without review
 * and a typo in a package name.
 *
 * Three of these entries are stricter than the layer bands alone would require, and each is a
 * rule the architecture note states: `@dttm/ui` cannot reach `@dttm/hooks` or `@dttm/queries`
 * even though all three sit in the Application band; `@dttm/queries` cannot reach
 * `@dttm/services`, because Application meets Feature only through the contract; and nothing
 * below Application may name a frontend package at all.
 */
export const ALLOWED_DEPENDENCIES: Record<string, readonly string[]> = {
  // Configuration, outside the layer graph
  '@dttm/config': [],
  // Layer 1, Foundation
  '@dttm/types': [],
  '@dttm/utils': [],
  '@dttm/logger': [],
  '@dttm/theme': [],
  '@dttm/env': ['@dttm/types'],
  '@dttm/database': [],
  '@dttm/validation': ['@dttm/database'],

  // Layer 2, Infrastructure
  '@dttm/contracts': ['@dttm/database', '@dttm/types', '@dttm/validation'],
  '@dttm/providers': [
    '@dttm/contracts',
    '@dttm/database',
    '@dttm/env',
    '@dttm/logger',
    '@dttm/types',
  ],
  '@dttm/auth': ['@dttm/contracts', '@dttm/logger', '@dttm/types'],

  // Layer 3, Feature. `@dttm/providers` is a development dependency only: the test support module
  // assembles the in-process fakes. Nothing in the shipped service code names an implementation.
  '@dttm/services': [
    '@dttm/auth',
    '@dttm/contracts',
    '@dttm/database',
    '@dttm/logger',
    '@dttm/providers',
    '@dttm/types',
    '@dttm/utils',
    '@dttm/validation',
  ],

  // Layer 4, Application. Hooks reach the contract's types through `@dttm/queries`, which
  // re-exports them, rather than importing the contract directly: one upstream dependency is what
  // keeps the binding layer a binding layer.
  '@dttm/queries': ['@dttm/contracts', '@dttm/types'],
  '@dttm/hooks': ['@dttm/queries', '@dttm/types'],
  '@dttm/ui': ['@dttm/theme', '@dttm/types', '@dttm/utils'],

  // Layer 5, Apps
  '@dttm/web': [
    '@dttm/auth',
    '@dttm/contracts',
    '@dttm/database',
    '@dttm/env',
    '@dttm/hooks',
    '@dttm/logger',
    '@dttm/providers',
    '@dttm/queries',
    '@dttm/services',
    '@dttm/theme',
    '@dttm/types',
    '@dttm/ui',
    '@dttm/utils',
    '@dttm/validation',
  ],

  // Tooling, outside the layer graph
  '@dttm/scripts': ['@dttm/config'],
  // Playwright: reaches the app and Storybook over HTTP only, so it names no other `@dttm/*`
  // package.
  '@dttm/e2e': ['@dttm/config'],
}

/**
 * Packages every other package may depend on. `@dttm/config` carries the TypeScript bases, the
 * lint rules, and the coverage thresholds: it is configuration a build reads, not a layer any
 * code imports at runtime, so it sits outside the direction rules rather than being repeated in
 * every entry above.
 */
export const UNIVERSAL_DEPENDENCIES: readonly string[] = ['@dttm/config']

/** The prefix that marks a dependency as internal to this repository. */
export const INTERNAL_SCOPE = '@dttm/'
