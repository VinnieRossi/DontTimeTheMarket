import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The workspace packages ship TypeScript source rather than a build, so the app compiles them.
  transpilePackages: [
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
  // The in-process database loads native assets, so it stays an external rather than being traced
  // into the bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
}

export default nextConfig
