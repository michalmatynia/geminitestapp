import 'server-only';

import { Redis } from 'ioredis';
import { logger } from '@/shared/utils/logger';

let connection: Redis | null = null;

export const getRedisConnection = (): Redis | null => {
  const url = process.env['REDIS_URL'];
  if (!url) return null;
  if (connection) return connection;
  connection = new Redis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    ...(process.env['REDIS_TLS'] === 'true' ? { tls: {} } : {}),
  });
  connection.on('error', (err) => {
    logger.error('[redis-connection] Connection error', err, {
      action: 'connection_error',
    });
  });
  return connection;
};

export const isRedisAvailable = (): boolean => {
  return !!process.env['REDIS_URL'];
};

export const closeRedisConnection = async (): Promise<void> => {
  if (connection) {
    await connection.quit();
    connection = null;
  }
};
