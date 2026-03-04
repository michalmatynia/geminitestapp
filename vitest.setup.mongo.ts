import 'dotenv/config';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/mocks/server';
import { invalidateAppDbProviderCache } from './src/shared/lib/db/app-db-provider';
import { invalidateCollectionProviderMapCache } from './src/shared/lib/db/collection-provider-map';
import { invalidateDatabaseEnginePolicyCache } from './src/shared/lib/db/database-engine-policy';

process.env['APP_DB_PROVIDER'] = 'mongodb';
process.env['PRODUCT_DB_PROVIDER'] = 'mongodb';
process.env['NOTE_DB_PROVIDER'] = 'mongodb';
process.env['INTEGRATION_DB_PROVIDER'] = 'mongodb';
process.env['AUTH_DB_PROVIDER'] = 'mongodb';
process.env['MONGODB_URI'] = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/test';
process.env['MONGODB_DB'] = process.env['MONGODB_DB'] ?? 'test';

const resetDbRoutingCaches = (): void => {
  invalidateAppDbProviderCache();
  invalidateCollectionProviderMapCache();
  invalidateDatabaseEnginePolicyCache();
};

const QUIET_TEST_LOG_PATTERNS = [
  'Activity:',
  'completed successfully',
  '[system] [timing]',
  '[getProducts] Total:',
  'Resolved provider:',
  'enqueuePathRun timing',
  '[mock-prompt] returning prompt for value:',
  '[image-studio] delete ',
  'Updated CMS page:',
  'Deleted CMS page:',
  '[queue:',
  '[ai-paths-service]',
];
const QUIET_TEST_LOG_SERVICES = new Set([
  'export-template-repository',
  'products.advanced-filter.mongo',
  'products.advanced-filter.prisma',
]);
const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const shouldSuppressStructuredTestLog = (args: unknown[]): boolean => {
  const [, secondArg] = args;
  const message = args
    .filter((arg): arg is string => typeof arg === 'string')
    .join(' ');

  if (QUIET_TEST_LOG_PATTERNS.some((pattern: string): boolean => message.includes(pattern))) {
    return true;
  }

  if (!isObjectRecord(secondArg)) {
    return false;
  }

  if (secondArg['expected'] === true) {
    return true;
  }

  const service =
    typeof secondArg['service'] === 'string' ? String(secondArg['service']).trim() : '';
  return QUIET_TEST_LOG_SERVICES.has(service);
};

console.log = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) return;
  originalConsoleLog(...args);
};

console.info = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) return;
  originalConsoleInfo(...args);
};

console.warn = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) return;
  originalConsoleWarn(...args);
};

console.error = (...args: unknown[]): void => {
  if (shouldSuppressStructuredTestLog(args)) return;
  originalConsoleError(...args);
};

beforeAll(() => {
  resetDbRoutingCaches();
  server.listen({
    onUnhandledRequest: 'bypass',
  });
});

afterEach(() => {
  resetDbRoutingCaches();
  server.resetHandlers();
});

afterAll(() => {
  resetDbRoutingCaches();
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  server.close();
});
