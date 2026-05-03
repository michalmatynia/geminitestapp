import 'server-only';

import { Redis } from 'ioredis';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


let connection: Redis | null = null;
const REDIS_PING_TIMEOUT_MS = 1_500;

const TRANSIENT_REDIS_ERROR_CODES = new Set(['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT']);

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

const captureException = async (
  error: unknown,
  context: { service: string; action: string }
): Promise<void> => {
  try {
    const mod = await import('@/shared/lib/observability/system-logger');
    await mod.ErrorSystem.captureException(error, context);
  } catch (error) {
    void ErrorSystem.captureException(error);
  
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
  return Boolean(process.env['REDIS_URL']);
};

export const isRedisReachable = async (): Promise<boolean> => {
  const url = process.env['REDIS_URL'];
  if (!url) return false;

  const probe = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: REDIS_PING_TIMEOUT_MS,
    retryStrategy: () => null,
    ...(process.env['REDIS_TLS'] === 'true' ? { tls: {} } : {}),
  });

  probe.on('error', () => {
    // Expected when Redis is unavailable; handled by returning false from this probe.
  });

  try {
    await probe.connect();
    const response = await probe.ping();
    return response === 'PONG';
  } catch (error) {
    void ErrorSystem.captureException(error);
    return false;
  } finally {
    probe.disconnect();
  }
};

export const closeRedisConnection = async (): Promise<void> => {
  if (connection) {
    await connection.quit();
    connection = null;
  }
};
