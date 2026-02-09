import 'server-only';

import { Redis } from 'ioredis';

import { isRedisAvailable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';

let initialized = false;
const REDIS_PING_TIMEOUT_MS = 1500;

const isRedisReachable = async (): Promise<boolean> => {
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
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
};

export const initializeQueues = (): void => {
  if (initialized) return;
  initialized = true;

  if (process.env['DISABLE_QUEUE_WORKERS'] === 'true') {
    console.log('[queues] Worker startup disabled by DISABLE_QUEUE_WORKERS');
    return;
  }

  if (!isRedisAvailable()) {
    console.log('[queues] Redis not available, using inline processing mode');
    return;
  }

  void (async (): Promise<void> => {
    const redisReachable = await isRedisReachable();
    if (!redisReachable) {
      console.warn('[queues] Redis unreachable, skipping BullMQ workers');
      return;
    }

    // Import all queue modules to trigger registration via createManagedQueue
    await Promise.all([
      import('@/features/jobs/workers/productAiQueue'),
      import('@/features/jobs/workers/aiPathRunQueue'),
      import('@/features/jobs/workers/chatbotJobQueue'),
      import('@/features/jobs/workers/agentQueue'),
      import('@/features/jobs/workers/aiInsightsQueue'),
    ]);

    console.log('[queues] Starting BullMQ workers...');
    startAllWorkers();
  })();
};
