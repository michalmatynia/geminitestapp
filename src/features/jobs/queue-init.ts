import 'server-only';

import { Redis } from 'ioredis';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


let initialized = false;
const REDIS_PING_TIMEOUT_MS = 1500;
const LOG_SOURCE = 'queue-init';
const STARTUP_GATED_QUEUE_NAMES = [
  'product-ai',
  'ai-path-run',
  'chatbot',
  'agent',
  'image-studio-run',
  'image-studio-sequence',
  'case-resolver-ocr',
  'ai-insights',
  'tradera-relist-scheduler',
] as const;
const KANGUR_SOCIAL_QUEUE_NAMES = [
  'kangur-social-scheduler',
  'kangur-social-pipeline',
] as const;

const parseEnvBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
};

export const shouldStartKangurSocialQueues = (
  env: NodeJS.ProcessEnv = process.env
): boolean => {
  if (parseEnvBoolean(env['DISABLE_KANGUR_SOCIAL_WORKERS']) === true) {
    return false;
  }

  const explicitEnable = parseEnvBoolean(env['ENABLE_KANGUR_SOCIAL_WORKERS']);
  if (explicitEnable !== null) {
    return explicitEnable;
  }

  return env['NODE_ENV'] === 'production';
};

const runStartupBackupSchedulerCatchup = (): void => {
  void (async (): Promise<void> => {
    try {
      const { tickDatabaseBackupScheduler } =
        await import('@/shared/lib/db/services/database-backup-scheduler');
      await tickDatabaseBackupScheduler();
    } catch (error) {
      void ErrorSystem.captureException(error);
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
  } catch (error) {
    void ErrorSystem.captureException(error);
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

    const shouldStartKangurSocial = shouldStartKangurSocialQueues();
    const excludedQueueNames = shouldStartKangurSocial
      ? [...STARTUP_GATED_QUEUE_NAMES]
      : [...STARTUP_GATED_QUEUE_NAMES, ...KANGUR_SOCIAL_QUEUE_NAMES];

    // Import all queue modules to trigger registration via createManagedQueue
    const queueModules = await Promise.all([
      import('@/server/queues/product-ai'),
      import('@/server/queues/ai'),
      import('@/server/queues/ai'),
      import('@/server/queues/ai'),
      import('@/shared/lib/db/workers/databaseBackupSchedulerQueue'),
      import('@/server/queues/ai'),
      import('@/server/queues/ai'),
      import('@/server/queues/integrations'),
      import('@/server/queues/integrations'),
      import('@/server/queues/integrations'),
      import('@/server/queues/product-sync'),
      import('@/server/queues/product-sync'),
      import('@/server/queues/product-sync'),
      import('@/server/queues/case-resolver-ocr'),
      import('@/shared/lib/observability/workers/systemLogAlertsQueue'),
      import('@/server/queues/kangur'),
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
    if (shouldStartKangurSocial) {
      (
        (queueModules[15] as Record<string, unknown>)['startKangurSocialSchedulerQueue'] as
          | (() => void)
          | undefined
      )?.();
      (
        (queueModules[15] as Record<string, unknown>)['startKangurSocialPipelineQueue'] as
          | (() => void)
          | undefined
      )?.();
    } else {
      void logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message:
          'Kangur social workers are disabled for this environment. Set ENABLE_KANGUR_SOCIAL_WORKERS=true to enable them.',
        context: {
          queueNames: [...KANGUR_SOCIAL_QUEUE_NAMES],
        },
      });
    }

    void logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Starting BullMQ workers...',
    });
    startAllWorkers({ excludeQueueNames: excludedQueueNames });

    // AI workers are started with feature-aware gates to avoid running disabled capabilities.
    (
      (queueModules[0] as Record<string, unknown>)['startProductAiJobQueue'] as
        | (() => void)
        | undefined
    )?.();
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
    const startAiInsightsQueue = (await import('@/server/queues/ai'))
      .startAiInsightsQueue as (() => void) | undefined;
    startAiInsightsQueue?.();
  })();
};

export const __testOnly = {
  resetInitialized(): void {
    initialized = false;
  },
};
