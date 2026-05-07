import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(appDir, '../..');

export default defineConfig({
  root: appDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@/features/database': path.resolve(appDir, 'src/features/database'),
      '@/components': path.resolve(appDir, 'src/components'),
      '@/shared': path.resolve(workspaceDir, 'src/shared'),
      '@kangur/contracts': path.resolve(workspaceDir, 'packages/kangur-contracts/src'),
      '@kangur/core': path.resolve(workspaceDir, 'packages/kangur-core/src'),
      '@kangur/api-client': path.resolve(workspaceDir, 'packages/kangur-api-client/src'),
      '@kangur/platform': path.resolve(workspaceDir, 'packages/kangur-platform/src'),
      'server-only': path.resolve(workspaceDir, '__tests__/mocks/server-only.js'),
      'next/server': path.resolve(
        workspaceDir,
        'node_modules/next/dist/server/web/exports/index.js',
      ),
      'next/navigation': path.resolve(
        workspaceDir,
        'node_modules/next/dist/client/components/navigation.js',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    fileParallelism: false,
    pool: 'forks',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '.next/**', 'e2e/**'],
    server: {
      deps: {
        inline: ['next', 'next-auth', 'next-intl'],
      },
    },
  },
});
