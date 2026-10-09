import thresholds from '@dttm/config/test-thresholds' with { type: 'json' }
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Test support is scaffolding for the tests rather than shipped behavior.
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/index.ts'],
      thresholds,
    },
  },
})
