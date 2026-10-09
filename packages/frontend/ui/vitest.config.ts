import thresholds from '@dttm/config/test-thresholds' with { type: 'json' }
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Story fixtures are scaffolding for the stories rather than shipped behavior, so counting
      // them would measure how thoroughly the tests test their own sample data.
      exclude: [
        'src/**/*.test.tsx',
        'src/**/*.stories.tsx',
        'src/index.ts',
        'src/story-support.ts',
      ],
      thresholds,
    },
  },
})
