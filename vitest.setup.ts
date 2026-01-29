import 'dotenv/config';
import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import React from 'react';
import { server } from './src/mocks/server';

// Force Prisma as the database provider for tests to ensure consistency with cleanup logic
process.env.APP_DB_PROVIDER = 'prisma';

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt?: string }) => {
    return React.createElement('img', { alt: props.alt ?? '' });
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement('a', { href }, children),
}));

/**
 * MSW Server Setup for Vitest
 * Establishes request mocking for all tests
 */
beforeAll(() => {
  // Start the MSW server before all tests
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();
});

afterAll(() => {
  // Clean up and stop the server after all tests complete
  server.close();
});
