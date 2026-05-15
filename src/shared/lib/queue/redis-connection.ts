/**
 * Redis Connection Manager
 * 
 * Manages the singleton Redis connection instance used by BullMQ queues.
 * 
 * Key architectural design points:
 * - Lazy Initialization: The connection is instantiated only when `getRedisConnection` is first called.
 * - Resilience: Implements a custom `retryStrategy` to handle temporary network issues,
 *   crucial for serverless-adjacent environments or unstable network conditions.
 * - BullMQ Compatibility: Configured with `maxRetriesPerRequest: null`, which is mandatory
 *   for correct operation with BullMQ.
 * - Observability: Automatically distinguishes between transient socket/transport errors 
 *   (ignored) and critical errors (logged to system observability).
 */

import 'server-only';

import { Redis } from 'ioredis';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

let connection: Redis | null = null;
const REDIS_PING_TIMEOUT_MS = 1_500;

const TRANSIENT_REDIS_ERROR_CODES = new Set(['EPIPE', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT']);

/**
 * Heuristic to classify Redis errors as transient (recoverable) or fatal.
 * 
 * @param error - The error object caught from ioredis.
 * @returns True if the error is considered transient/non-fatal.
 */
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

/**
 * Safely captures exceptions, attempting to use the system logger if available.
 */
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

/**
 * Returns the active Redis connection instance, creating it if it doesn't exist.
 * 
 * Uses `process.env['REDIS_URL']` to configure the connection. If the environment
 * variable is missing, this function returns `null`.
 * 
 * @returns The active Redis connection or null if not configured.
 */
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

/**
 * Checks if Redis configuration is present. Does not verify connectivity.
 * 
 * @returns True if `REDIS_URL` is set.
 */
export const isRedisAvailable = (): boolean => {
  return Boolean(process.env['REDIS_URL']);
};

/**
 * Performs a lightweight health check against Redis.
 * Creates a short-lived connection just for the PING operation.
 * 
 * @returns A promise resolving to true if a PONG response is received.
 */
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

/**
 * Explicitly closes the singleton Redis connection and resets the state.
 */
export const closeRedisConnection = async (): Promise<void> => {
  if (connection) {
    await connection.quit();
    connection = null;
  }
};
