import { defineConfig } from 'vitest/config'

/**
 * The gate's own tests. They exist to prove the governance hooks block what they claim to block,
 * which is a property no coverage percentage measures, so no threshold is applied here. The
 * validators themselves are exercised by the gate on every run.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['hooks/**/*.test.ts', '*.test.ts'],
    testTimeout: 20_000,
  },
})
