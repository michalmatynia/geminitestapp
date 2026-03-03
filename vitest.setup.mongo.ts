import 'dotenv/config';

import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/mocks/server';

process.env['APP_DB_PROVIDER'] = 'mongodb';
process.env['PRODUCT_DB_PROVIDER'] = 'mongodb';
process.env['NOTE_DB_PROVIDER'] = 'mongodb';
process.env['INTEGRATION_DB_PROVIDER'] = 'mongodb';
process.env['AUTH_DB_PROVIDER'] = 'mongodb';
process.env['MONGODB_URI'] = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/test';
process.env['MONGODB_DB'] = process.env['MONGODB_DB'] ?? 'test';

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
