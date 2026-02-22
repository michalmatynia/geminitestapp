import 'server-only';

import { Redis } from 'ioredis';

let connection: Redis | null = null;

const TRANSIENT_REDIS_ERROR_CODES = new Set([
  'EPIPE',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
]);

const isTransientRedisTransportError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  if (typeof code === 'string' && TRANSIENT_REDIS_ERROR_CODES.has(code.toUpperCase())) {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('write epipe') ||
    message.includes('read econnreset') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('connection is closed') ||
    message.includes('socket closed unexpectedly') ||
    message.includes('timeout')
  );
};

const captureException = async (error: unknown, context: { service: string; action: string }): Promise<void> => {
  try {
    // eslint-disable-next-line 
    const mod = await import('@/features/observability/server');
    await mod.ErrorSystem.captureException(error, context);
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
    retryStrategy: (attempt: number): number => Math.min(attempt * 100, 2_000),
    reconnectOnError: () => true,
    ...(process.env['REDIS_TLS'] === 'true' ? { tls: {} } : {}),
  });
  connection.on('error', (err) => {
    if (isTransientRedisTransportError(err)) return;
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
