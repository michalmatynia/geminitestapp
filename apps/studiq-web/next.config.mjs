import path from 'node:path';
import { fileURLToPath } from 'node:url';

import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, '..', '..');

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
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      '@/app': path.resolve(monorepoRoot, 'src/app'),
      '@/features': path.resolve(monorepoRoot, 'src/features'),
      '@/shared': path.resolve(monorepoRoot, 'src/shared'),
      '@docs': path.resolve(monorepoRoot, 'docs'),
    },
  },
  outputFileTracingRoot: monorepoRoot,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(nextConfig);
