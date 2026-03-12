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
      '@/__tests__': path.resolve(__dirname, './__tests__'),
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './__tests__/mocks/server-only.js'),
      'next/navigation': path.resolve(
        __dirname,
        './node_modules/next/dist/client/components/navigation.js'
      ),
      'next/server': nextServerExportPath,
      [nextServerAbsoluteImportPath]: nextServerExportPath,
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
    server: {
      deps: {
        inline: ['next-auth'],
      },
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
        },
      },
    ],
  },
  resolve: {
    alias: {
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
      '@docs': path.resolve(__dirname, './docs'),
      '@/__tests__': path.resolve(__dirname, './__tests__'),
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './__tests__/mocks/server-only.js'),
    },
  },
});
