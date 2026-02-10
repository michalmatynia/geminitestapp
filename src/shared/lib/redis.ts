import 'server-only';

import { Redis } from 'ioredis';

import { logger } from '@/shared/utils/logger';

const REDIS_URL = process.env['REDIS_URL'];

let redis: Redis | null = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    
    redis.on('error', (err) => {
      logger.error('[redis] connection error', err, { source: 'redis' });
    });
  } catch (error) {
    logger.error('[redis] failed to initialize client', error, { source: 'redis' });
  }
}

export function getRedisClient(): Redis | null {
  return redis;
}

export const isRedisEnabled = (): boolean => redis !== null;

export async function closeRedisClient(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {
      // Already disconnected
    }
    redis = null;
  }
}
