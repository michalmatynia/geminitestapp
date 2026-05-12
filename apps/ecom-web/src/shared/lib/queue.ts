import 'server-only';

import { Redis } from 'ioredis';

let connection: Redis | null = null;

export const getRedisConnection = (): Pick<Redis, 'get'> | null => {
  const url = process.env['REDIS_URL']?.trim();
  if (url === undefined || url === '') return null;
  if (connection !== null) return connection;

  connection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (attempt: number): number => Math.min(attempt * 100, 2_000),
    reconnectOnError: () => true,
    ...(process.env['REDIS_TLS'] === 'true' ? { tls: {} } : {}),
  });
  connection.on('error', () => {
    // Redis coupons are optional; promo lookup falls back to MongoDB/static codes.
  });
  return connection;
};
