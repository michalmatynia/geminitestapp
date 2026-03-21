import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { mongoIntegrationTestFiles } from './scripts/testing/lib/vitest-integration-projects.mjs';

const bazelWorkspaceMirrorExcludes = [
  'bazel-geminitestapp/**',
  'bazel-bin/**',
  'bazel-out/**',
  'bazel-testlogs/**',
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/__tests__': path.resolve(__dirname, './__tests__'),
      '@docs': path.resolve(__dirname, './docs'),
      '@kangur/contracts': path.resolve(__dirname, './packages/kangur-contracts/src/index.ts'),
      '@kangur/core': path.resolve(__dirname, './packages/kangur-core/src/index.ts'),
      '@kangur/api-client': path.resolve(__dirname, './packages/kangur-api-client/src/index.ts'),
      '@kangur/platform': path.resolve(__dirname, './packages/kangur-platform/src/index.ts'),
      'server-only': path.resolve(__dirname, './__tests__/mocks/server-only.js'),
      'next/server': path.resolve(__dirname, './node_modules/next/dist/server/web/exports/index.js'),
      'next/navigation': path.resolve(__dirname, './node_modules/next/dist/client/components/navigation.js'),
    },
  },
  test: {
    server: {
      deps: {
        inline: ['next', 'next-auth', 'next-intl'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          hookTimeout: 30_000,
          testTimeout: 30_000,
          fileParallelism: false,
          pool: 'forks',
          include: configDefaults.include,
          exclude: [
            ...configDefaults.exclude,
            ...bazelWorkspaceMirrorExcludes,
            'e2e/**',
            '.next/**',
            ...mongoIntegrationTestFiles,
          ],
          alias: {
            '@/__tests__': path.resolve(__dirname, './__tests__'),
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration-mongo',
          globals: true,
          environment: 'node',
          setupFiles: ['./vitest.setup.mongo.ts'],
          fileParallelism: false,
          include: mongoIntegrationTestFiles,
          exclude: [...configDefaults.exclude, ...bazelWorkspaceMirrorExcludes, 'e2e/**', '.next/**'],
          pool: 'forks',
          alias: {
            '@/__tests__': path.resolve(__dirname, './__tests__'),
          },
        },
      },
    ],
  },
});
