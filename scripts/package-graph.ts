/**
 * The dependency allowlist. Every internal package is named here with exactly the internal
 * packages it may depend on, and a package that is not named here fails the check.
 *
 * An allowlist rather than a blocklist, because a blocklist only catches the violations
 * somebody already thought of, while an allowlist also catches a package added without review
 * and a typo in a package name.
 *
 * Two of these entries are stricter than the layer bands alone would require, and each is a rule
 * the architecture note states: `@dttm/ui` cannot reach `@dttm/engine` or `@dttm/hooks` even
 * though ui and hooks sit in the same band, because a component that reaches for the simulation
 * cannot be rendered from props alone; and `@dttm/engine` names no frontend package at all,
 * because the simulation has to run with no screen attached for a replay to verify a score.
 */
export const ALLOWED_DEPENDENCIES: Record<string, readonly string[]> = {
  // Configuration, outside the layer graph
  '@dttm/config': [],
  // Layer 1, Foundation
  '@dttm/types': [],
  '@dttm/utils': [],
  '@dttm/theme': [],
  '@dttm/validation': ['@dttm/types'],

  // Layer 3, Feature
  '@dttm/engine': ['@dttm/types', '@dttm/utils'],

  // Layer 4, Application
  '@dttm/hooks': ['@dttm/engine', '@dttm/types'],
  '@dttm/ui': ['@dttm/theme', '@dttm/types', '@dttm/utils', '@dttm/validation'],

  // Layer 5, Apps
  '@dttm/web': [
    '@dttm/engine',
    '@dttm/hooks',
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
