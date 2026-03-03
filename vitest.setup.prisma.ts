import 'dotenv/config';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/mocks/server';

process.env['APP_DB_PROVIDER'] = 'prisma';
process.env['PRODUCT_DB_PROVIDER'] = 'prisma';
process.env['NOTE_DB_PROVIDER'] = 'prisma';
process.env['INTEGRATION_DB_PROVIDER'] = 'prisma';
process.env['AUTH_DB_PROVIDER'] = 'prisma';

const PG_QUERY_QUEUE_DEPRECATION =
  'Calling client.query() when the client is already executing a query is deprecated';
const QUIET_TEST_LOG_PATTERNS = [
  'Activity:',
  'completed successfully',
  '[system] [timing]',
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
const originalEmitWarning = process.emitWarning.bind(process);
const originalConsoleLog = console.log.bind(console);
const originalConsoleInfo = console.info.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const shouldSuppressStructuredTestLog = (args: unknown[]): boolean => {
  const [firstArg, secondArg] = args;
  const message = typeof firstArg === 'string' ? firstArg : '';

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

process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const warningType =
    typeof args[0] === 'string'
      ? args[0]
      : warning instanceof Error
        ? warning.name
        : '';
  const warningMessage =
    typeof warning === 'string'
      ? warning
      : warning instanceof Error
        ? warning.message
        : String(warning);

  if (
    warningType === 'DeprecationWarning' &&
    warningMessage.includes(PG_QUERY_QUEUE_DEPRECATION)
  ) {
    return;
  }

  return (originalEmitWarning as (...emitArgs: unknown[]) => void)(
    warning as unknown as string,
    ...(args as unknown[])
  );
}) as typeof process.emitWarning;

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  process.emitWarning = originalEmitWarning;
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  server.close();
});
