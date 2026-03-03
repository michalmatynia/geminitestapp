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
const originalEmitWarning = process.emitWarning.bind(process);

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
  server.close();
});
