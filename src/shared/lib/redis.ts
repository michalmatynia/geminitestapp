import 'server-only';

import { Redis } from 'ioredis';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


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

const globalForRedis = global as typeof global & {
  redis?: Redis;
  redisInitializedAtMs?: number;
};

let redis: Redis | null = globalForRedis.redis ?? null;
let redisInitializedAtMs: number | null = globalForRedis.redisInitializedAtMs ?? null;

const ensureRedisClient = (): Redis | null => {
  const url = process.env['REDIS_URL'];
  if (!url) return null;
  if (redis) return redis;

  try {
    const startedAt = Date.now();
    const client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });

    client.on('error', (err) => {
      if (isTransientRedisTransportError(err)) return;
      void captureException(err, { service: 'redis', action: 'connection_error' });
    });

    redis = client;
    redisInitializedAtMs = startedAt;

    if (process.env.NODE_ENV !== 'production') {
      globalForRedis.redis = client;
      globalForRedis.redisInitializedAtMs = startedAt;
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
    void captureException(error, { service: 'redis', action: 'initialize_failed' });
    redis = null;
  }

  return redis;
};

export function getRedisClient(): Redis | null {
  return ensureRedisClient();
}

export const isRedisEnabled = (): boolean => {
  return !!process.env['REDIS_URL'];
};

export const getRedisInitializationTimestampMs = (): number | null => {
  return redisInitializedAtMs;
};

export async function closeRedisClient(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      void ErrorSystem.captureException(error);
    
      // Already disconnected
    }
    redis = null;
  }
}
