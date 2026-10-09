import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The workspace packages ship TypeScript source rather than a build, so the app compiles them.
  transpilePackages: [
    '@dttm/engine',
    '@dttm/hooks',
    '@dttm/theme',
    '@dttm/types',
    '@dttm/ui',
    '@dttm/utils',
    '@dttm/validation',
  ],
}

export default nextConfig
