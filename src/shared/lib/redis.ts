import 'server-only';

import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'];

let redis: Redis | null = null;

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

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
    
    redis.on('error', (err) => {
      void captureException(err, { service: 'redis', action: 'connection_error' });
    });
  } catch (error) {
    void captureException(error, { service: 'redis', action: 'initialize_failed' });
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
