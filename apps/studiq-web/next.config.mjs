import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nextEnv from '@next/env';
import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, '..', '..');
const isDev = process.env.NODE_ENV !== 'production';
const { loadEnvConfig } = nextEnv;

loadEnvConfig(monorepoRoot, isDev);

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const cacheLifeProfiles = {
  swr60: {
    stale: 60,
    revalidate: 60,
    expire: 300,
  },
  swr300: {
    stale: 300,
    revalidate: 300,
    expire: 3600,
  },
  swr86400: {
    stale: 300,
    revalidate: 86400,
    expire: 604800,
  },
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@kangur/core',
    '@kangur/contracts',
    '@kangur/api-client',
    '@kangur/platform',
  ],
  serverExternalPackages: ['mongodb'],
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      '@/app': path.resolve(monorepoRoot, 'src/app'),
      '@/features': path.resolve(monorepoRoot, 'src/features'),
      '@/shared': path.resolve(monorepoRoot, 'src/shared'),
      '@/server': path.resolve(monorepoRoot, 'src/server'),
      '@docs': path.resolve(monorepoRoot, 'docs'),
    },
  },
  outputFileTracingRoot: monorepoRoot,
  cacheComponents: true,
  cacheLife: cacheLifeProfiles,
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/kangur' },
        { source: '/:locale(pl|en|de|uk)', destination: '/:locale/kangur' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default withNextIntl(nextConfig);
