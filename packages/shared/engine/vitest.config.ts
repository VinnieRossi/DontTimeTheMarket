import thresholds from '@dttm/config/test-thresholds' with { type: 'json' }
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Test support is scaffolding for the tests rather than shipped behavior, so counting it
      // would measure how thoroughly the tests test their own helpers.
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/test-support.ts'],
      thresholds,
    },
  },
})
