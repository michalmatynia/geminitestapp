import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const monorepoRoot = path.resolve(__dirname, '..', '..');
const isDev = process.env.NODE_ENV !== 'production';
const { loadDatabaseEngineWebEnv } = require('../../scripts/runtime/database-engine-web-env.cjs');

loadDatabaseEngineWebEnv({ repoRoot: monorepoRoot, appDir: __dirname, isDev });

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
  cacheComponents: true,
  cacheLife: cacheLifeProfiles,
  devIndicators: false,
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: [
    '@auth/core',
    '@auth/mongodb-adapter',
    'bcryptjs',
    'mongodb',
    'nodemailer',
    'openai',
    'sharp',
  ],
  transpilePackages: [
    '@kangur/core',
    '@kangur/contracts',
    '@kangur/api-client',
    '@kangur/platform',
  ],
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/features/database': path.resolve(__dirname, 'src/features/database'),
      '@/shared': path.resolve(monorepoRoot, 'src/shared'),
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['@/components'] = path.resolve(__dirname, 'src/components');
    config.resolve.alias['@/features/database'] = path.resolve(__dirname, 'src/features/database');
    config.resolve.alias['@/shared'] = path.resolve(monorepoRoot, 'src/shared');
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
