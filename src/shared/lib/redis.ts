/**
 * Redis Client
 * 
 * Redis client management and connection utilities.
 * Provides:
 * - Redis connection management
 * - Transient error handling
 * - Error tracking and reporting
 * - Connection health monitoring
 * - Server-only Redis operations
 */

import 'server-only';

import { Redis } from 'ioredis';
import { isTransientRedisTransportError } from '@/shared/lib/redis-error-utils';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

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

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const REDIS_CONNECT_TIMEOUT_MS = parsePositiveInt(process.env['REDIS_CONNECT_TIMEOUT_MS'], 750);
const REDIS_MAX_RETRIES_PER_REQUEST = parsePositiveInt(
  process.env['REDIS_MAX_RETRIES_PER_REQUEST'],
  1
);

const ensureRedisClient = (): Redis | null => {
  const url = process.env['REDIS_URL'];
  if (!url) return null;
  if (redis) return redis;

  try {
    const startedAt = Date.now();
    const client = new Redis(url, {
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      enableOfflineQueue: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: REDIS_MAX_RETRIES_PER_REQUEST,
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
  return Boolean(process.env['REDIS_URL']);
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
