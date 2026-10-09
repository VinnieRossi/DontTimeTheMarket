import thresholds from '@dttm/config/test-thresholds' with { type: 'json' }
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Every test that opens an in-process database boots Postgres and applies the migrations, which
    // outruns the default 5 seconds on a loaded CI runner. Setup hooks open databases too, and they
    // have their own limit.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds,
    },
  },
})
