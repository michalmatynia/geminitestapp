import 'server-only';

import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'];

let redis: Redis | null = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    
    redis.on('error', (err) => {
      console.error('[redis] connection error:', err);
      void (async (): Promise<void> => {
        try {
          const { logSystemEvent } = await import('@/features/observability/server');
          await logSystemEvent({
            level: 'error',
            message: '[redis] connection error',
            source: 'redis',
            error: err,
          });
        } catch { /* ignore */ }
      })();
    });
  } catch (error) {
    console.error('[redis] failed to initialize client:', error);
    void (async (): Promise<void> => {
      try {
        const { logSystemEvent } = await import('@/features/observability/server');
        await logSystemEvent({
          level: 'error',
          message: '[redis] failed to initialize client',
          source: 'redis',
          error,
        });
      } catch { /* ignore */ }
    })();
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
