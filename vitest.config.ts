import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const prismaIntegrationTestFiles = [
  '__tests__/features/ai/ai-paths/services/path-run-repository.test.ts',
  '__tests__/features/ai/ai-paths/services/path-run-service.test.ts',
  '__tests__/features/cms/api/cms-pages.test.ts',
  '__tests__/features/cms/api/cms.test.ts',
  '__tests__/features/drafter/services/draft-repository.test.ts',
  '__tests__/features/files/api/files.test.ts',
  '__tests__/features/integrations/services/category-mapping-repository.test.ts',
  '__tests__/features/integrations/services/export-template-repository.test.ts',
  '__tests__/features/internationalization/api/countries.test.ts',
  '__tests__/features/internationalization/api/currencies.test.ts',
  '__tests__/features/internationalization/api/languages.test.ts',
  '__tests__/features/notesapp/api/categories.test.ts',
  '__tests__/features/notesapp/api/notes.test.ts',
  '__tests__/features/notesapp/api/tags.test.ts',
  '__tests__/features/notesapp/services/note-service.test.ts',
  '__tests__/features/products/api/pagination.test.ts',
  '__tests__/features/products/services/prismaProductRepository.test.ts',
  '__tests__/features/products/services/productMigration.test.ts',
  '__tests__/features/products/services/productService.test.ts',
  '__tests__/features/viewer3d/services/prisma-asset3d-repository.test.ts',
];

const mongoIntegrationTestFiles = [
  '__tests__/features/cms/services/mongo-cms-repository.test.ts',
  '__tests__/features/notesapp/services/mongo-note-repository.test.ts',
  '__tests__/features/products/services/mongo-parameter-repository.test.ts',
  '__tests__/features/products/services/mongo-product-repository.test.ts',
  '__tests__/features/products/services/mongo-product-canonical-shape-guard.test.ts',
  '__tests__/features/ai/ai-paths/runtime/handlers/integration-database-mongo-update-plan-helpers.test.ts',
  'src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-delete-action.test.ts',
  'src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-update-action.test.ts',
  'src/shared/lib/ai-paths/core/runtime/handlers/__tests__/integration-database-mongo-update-plan.test.ts',
  'src/shared/lib/products/services/product-repository/__tests__/mongo-product-repository-mappers.test.ts',
];

export default defineConfig({
  plugins: [react()],
  test: {
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
          fileParallelism: false,
          pool: 'forks',
          include: configDefaults.include,
          exclude: [
            ...configDefaults.exclude,
            'e2e/**',
            '.next/**',
            ...prismaIntegrationTestFiles,
            ...mongoIntegrationTestFiles,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration-prisma',
          globals: true,
          environment: 'node',
          setupFiles: ['./vitest.setup.prisma.ts'],
          fileParallelism: false,
          include: prismaIntegrationTestFiles,
          exclude: [...configDefaults.exclude, 'e2e/**', '.next/**'],
          pool: 'forks',
          testTimeout: 30_000,
          hookTimeout: 30_000,
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
          exclude: [...configDefaults.exclude, 'e2e/**', '.next/**'],
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
