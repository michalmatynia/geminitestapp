import 'dotenv/config';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/mocks/server';

process.env['APP_DB_PROVIDER'] = 'prisma';
process.env['PRODUCT_DB_PROVIDER'] = 'prisma';
process.env['NOTE_DB_PROVIDER'] = 'prisma';
process.env['INTEGRATION_DB_PROVIDER'] = 'prisma';
process.env['AUTH_DB_PROVIDER'] = 'prisma';

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
