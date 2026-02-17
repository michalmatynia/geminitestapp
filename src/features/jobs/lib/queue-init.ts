import 'server-only';

import { Redis } from 'ioredis';

import { logSystemEvent } from '@/features/observability/server';
import { isRedisAvailable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';

let initialized = false;
const REDIS_PING_TIMEOUT_MS = 1500;
const LOG_SOURCE = 'queue-init';

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
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Worker startup disabled by DISABLE_QUEUE_WORKERS'
    });
    return;
  }

  if (!isRedisAvailable()) {
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Redis not available, using inline processing mode'
    });
    return;
  }

  void (async (): Promise<void> => {
    const redisReachable = await isRedisReachable();
    if (!redisReachable) {
      void logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: 'Redis unreachable, skipping BullMQ workers'
      });
      return;
    }

    // Import all queue modules to trigger registration via createManagedQueue
    const queueModules = await Promise.all([
      import('@/features/jobs/workers/productAiQueue'),
      import('@/features/jobs/workers/aiPathRunQueue'),
      import('@/features/jobs/workers/chatbotJobQueue'),
      import('@/features/jobs/workers/agentQueue'),
      import('@/features/jobs/workers/aiInsightsQueue'),
      import('@/features/jobs/workers/databaseBackupSchedulerQueue'),
      import('@/features/jobs/workers/imageStudioRunQueue'),
      import('@/features/jobs/workers/imageStudioSequenceQueue'),
      import('@/features/jobs/workers/traderaListingQueue'),
      import('@/features/jobs/workers/traderaRelistSchedulerQueue'),
      import('@/features/jobs/workers/baseImportQueue'),
      import('@/features/jobs/workers/productSyncQueue'),
      import('@/features/jobs/workers/productSyncBackfillQueue'),
      import('@/features/jobs/workers/productSyncSchedulerQueue'),
    ]);
    const backupSchedulerModule = queueModules[5] as {
      startDatabaseBackupSchedulerQueue?: () => void;
    };
    backupSchedulerModule.startDatabaseBackupSchedulerQueue?.();
    const traderaSchedulerModule = queueModules[9] as {
      startTraderaRelistSchedulerQueue?: () => void;
    };
    traderaSchedulerModule.startTraderaRelistSchedulerQueue?.();
    const productSyncSchedulerModule = queueModules[13] as {
      startProductSyncSchedulerQueue?: () => void;
    };
    productSyncSchedulerModule.startProductSyncSchedulerQueue?.();

    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Starting BullMQ workers...'
    });
    startAllWorkers();
  })();
};
