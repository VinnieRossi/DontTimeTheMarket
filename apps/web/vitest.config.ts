import { defineConfig } from 'vitest/config'

/**
 * The app's own tests cover the view mapping: the pure functions that turn a game state into the
 * strings and flags the components take. No coverage threshold is set here, because this package
 * holds composition and the behavior behind it is covered where it lives, in the engine and the
 * component packages.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
