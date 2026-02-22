import 'server-only';

import { Redis } from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'];

let redis: Redis | null = null;

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
     
    const mod = await import('@/features/observability/server');
    await mod.ErrorSystem.captureException(error, context);
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
      if (isTransientRedisTransportError(err)) return;
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
