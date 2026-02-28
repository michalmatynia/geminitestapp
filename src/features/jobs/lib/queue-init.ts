import 'server-only';

import { Redis } from 'ioredis';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';

let initialized = false;
const REDIS_PING_TIMEOUT_MS = 1500;
const LOG_SOURCE = 'queue-init';

const runStartupBackupSchedulerCatchup = (): void => {
  void (async (): Promise<void> => {
    try {
      const { tickDatabaseBackupScheduler } =
        await import('@/shared/lib/db/services/database-backup-scheduler');
      await tickDatabaseBackupScheduler();
    } catch (error) {
      void logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: 'Startup backup scheduler catch-up tick failed',
        error,
      });
    }
  })();
};

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
      message: 'Worker startup disabled by DISABLE_QUEUE_WORKERS',
    });
    runStartupBackupSchedulerCatchup();
    return;
  }

  if (!isRedisAvailable()) {
    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Redis not available, using inline processing mode',
    });
    runStartupBackupSchedulerCatchup();
    return;
  }

  void (async (): Promise<void> => {
    const redisReachable = await isRedisReachable();
    if (!redisReachable) {
      void logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: 'Redis unreachable, skipping BullMQ workers',
      });
      runStartupBackupSchedulerCatchup();
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
      import('@/features/jobs/workers/caseResolverOcrQueue'),
    ]);

    // Call specialized startup functions if they exist (to enqueue repeat jobs, etc.)
    (
      (queueModules[1] as Record<string, unknown>)['startAiPathRunQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[3] as Record<string, unknown>)['startAgentQueue'] as (() => void) | undefined
    )?.();
    (
      (queueModules[5] as Record<string, unknown>)['startDatabaseBackupSchedulerQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[9] as Record<string, unknown>)['startTraderaRelistSchedulerQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[13] as Record<string, unknown>)['startProductSyncSchedulerQueue'] as
        | (() => void)
        | undefined
    )?.();

    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Starting BullMQ workers...',
    });
    startAllWorkers();
  })();
};
