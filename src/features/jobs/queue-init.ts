import 'server-only';

import { Redis } from 'ioredis';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';

let initialized = false;
const REDIS_PING_TIMEOUT_MS = 1500;
const LOG_SOURCE = 'queue-init';
const STARTUP_GATED_QUEUE_NAMES = [
  'ai-path-run',
  'chatbot',
  'agent',
  'image-studio-run',
  'image-studio-sequence',
  'case-resolver-ocr',
  'ai-insights',
  'tradera-relist-scheduler',
] as const;

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
      import('@/features/products/server'),
      import('@/features/ai/server'),
      import('@/features/ai/server'),
      import('@/features/ai/server'),
      import('@/shared/lib/db/workers/databaseBackupSchedulerQueue'),
      import('@/features/ai/server'),
      import('@/features/ai/server'),
      import('@/features/integrations/server'),
      import('@/features/integrations/server'),
      import('@/features/integrations/server'),
      import('@/features/product-sync/server'),
      import('@/features/product-sync/server'),
      import('@/features/product-sync/server'),
      import('@/server/queues/case-resolver-ocr'),
      import('@/shared/lib/observability/workers/systemLogAlertsQueue'),
    ]);

    // Call specialized startup functions if they exist (to enqueue repeat jobs, etc.)
    (
      (queueModules[4] as Record<string, unknown>)['startDatabaseBackupSchedulerQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[8] as Record<string, unknown>)['startTraderaRelistSchedulerQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[12] as Record<string, unknown>)['startProductSyncSchedulerQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[14] as Record<string, unknown>)['startSystemLogAlertsQueue'] as
        | (() => void)
        | undefined
    )?.();

    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Starting BullMQ workers...',
    });
    startAllWorkers({ excludeQueueNames: STARTUP_GATED_QUEUE_NAMES });

    // AI workers are started with feature-aware gates to avoid running disabled capabilities.
    (
      (queueModules[1] as Record<string, unknown>)['startAiPathRunQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[2] as Record<string, unknown>)['startChatbotJobQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[3] as Record<string, unknown>)['startAgentQueue'] as (() => void) | undefined
    )?.();
    (
      (queueModules[5] as Record<string, unknown>)['startImageStudioRunQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[6] as Record<string, unknown>)['startImageStudioSequenceQueue'] as
        | (() => void)
        | undefined
    )?.();
    (
      (queueModules[13] as Record<string, unknown>)['startCaseResolverOcrQueue'] as
        | (() => void)
        | undefined
    )?.();

    // AI Insights queue is started separately after the generic startup pass so Brain gating
    // can decide whether the worker should run at all.
    const startAiInsightsQueue = (await import('@/features/ai/server'))
      .startAiInsightsQueue as (() => void) | undefined;
    startAiInsightsQueue?.();
  })();
};

export const __testOnly = {
  resetInitialized(): void {
    initialized = false;
  },
};
