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
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
