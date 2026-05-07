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
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      '@/app': path.resolve(monorepoRoot, 'src/app'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/features': path.resolve(monorepoRoot, 'src/features'),
      '@/shared': path.resolve(monorepoRoot, 'src/shared'),
      '@/server': path.resolve(monorepoRoot, 'src/server'),
      '@/i18n': path.resolve(monorepoRoot, 'src/i18n'),
      '@docs': path.resolve(monorepoRoot, 'docs'),
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['@/app'] = path.resolve(monorepoRoot, 'src/app');
    config.resolve.alias['@/components'] = path.resolve(__dirname, 'src/components');
    config.resolve.alias['@/features'] = path.resolve(monorepoRoot, 'src/features');
    config.resolve.alias['@/shared'] = path.resolve(monorepoRoot, 'src/shared');
    config.resolve.alias['@/server'] = path.resolve(monorepoRoot, 'src/server');
    config.resolve.alias['@/i18n'] = path.resolve(monorepoRoot, 'src/i18n');
    config.resolve.alias['@docs'] = path.resolve(monorepoRoot, 'docs');
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
