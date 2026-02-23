import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    fileParallelism: false,
    exclude: [...configDefaults.exclude, 'e2e/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@/__tests__': path.resolve(__dirname, './__tests__'),
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './__tests__/mocks/server-only.js'),
      'next/server': path.resolve(__dirname, './node_modules/next/server.js'),
    },
  },
});
