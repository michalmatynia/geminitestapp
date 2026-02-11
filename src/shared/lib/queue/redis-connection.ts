import 'server-only';

import { Redis } from 'ioredis';

let connection: Redis | null = null;

const captureException = async (error: unknown, context: { service: string; action: string }): Promise<void> => {
  try {
    // eslint-disable-next-line import/no-restricted-paths
    const { ErrorSystem } = await import('@/features/observability/server');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    await ErrorSystem.captureException(error, context as any);
  } catch {
    // ignore
  }
};

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
    void captureException(err, {
      service: 'redis-connection',
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
