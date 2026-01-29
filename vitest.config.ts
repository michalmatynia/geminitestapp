import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    fileParallelism: false,
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './__tests__/mocks/server-only.js'),
    },
  },
});
