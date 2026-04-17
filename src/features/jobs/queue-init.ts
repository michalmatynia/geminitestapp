import 'server-only';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


let initialized = false;
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
  (async (): Promise<void> => {
    try {
      const { tickDatabaseBackupScheduler } =
        await import('@/shared/lib/db/services/database-backup-scheduler');
      await tickDatabaseBackupScheduler();
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => {});
      logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: 'Startup backup scheduler catch-up tick failed',
        error,
      }).catch(() => {});
    }
  })().catch(() => {});
};

const callSpecializedStartup = (queueModules: any[], shouldStartKangurSocial: boolean): void => {
  const mod4 = queueModules[4] as Record<string, unknown>;
  const mod8 = queueModules[8] as Record<string, unknown>;
  const mod12 = queueModules[12] as Record<string, unknown>;
  const mod14 = queueModules[14] as Record<string, unknown>;
  const mod16 = queueModules[16] as Record<string, unknown>;

  (mod4['startDatabaseBackupSchedulerQueue'] as (() => void) | undefined)?.();
  (mod8['startTraderaRelistSchedulerQueue'] as (() => void) | undefined)?.();
  (mod12['startProductSyncSchedulerQueue'] as (() => void) | undefined)?.();
  (mod14['startSystemLogAlertsQueue'] as (() => void) | undefined)?.();
  (mod16['startFilemakerEmailCampaignSchedulerQueue'] as (() => void) | undefined)?.();

  if (shouldStartKangurSocial) {
    const mod15 = queueModules[15] as Record<string, unknown>;
    (mod15['startKangurSocialSchedulerQueue'] as (() => void) | undefined)?.();
    (mod15['startKangurSocialPipelineQueue'] as (() => void) | undefined)?.();
  } else {
    logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Kangur social workers are disabled for this environment. Set ENABLE_KANGUR_SOCIAL_WORKERS=true to enable them.',
      context: { queueNames: [...KANGUR_SOCIAL_QUEUE_NAMES] },
    }).catch(() => {});
  }
};

const callQueueStarter = (
  queueModules: any[],
  index: number,
  exportName: string
): void => {
  const starter = (queueModules[index] as Record<string, unknown>)[exportName];
  if (typeof starter === 'function') starter();
};

const startFeatureAwareWorkers = (queueModules: any[]): void => {
  callQueueStarter(queueModules, 0, 'startProductAiJobQueue');
  callQueueStarter(queueModules, 1, 'startAiPathRunQueue');
  callQueueStarter(queueModules, 2, 'startChatbotJobQueue');
  callQueueStarter(queueModules, 3, 'startAgentQueue');
  callQueueStarter(queueModules, 5, 'startImageStudioRunQueue');
  callQueueStarter(queueModules, 6, 'startImageStudioSequenceQueue');
  callQueueStarter(queueModules, 13, 'startCaseResolverOcrQueue');
};

export const initializeQueues = (): void => {
  if (initialized) return;
  initialized = true;

  if (process.env['DISABLE_QUEUE_WORKERS'] === 'true') {
    logSystemEvent({ level: 'info', source: LOG_SOURCE, message: 'Worker startup disabled by DISABLE_QUEUE_WORKERS' }).catch(() => {});
    runStartupBackupSchedulerCatchup();
    return;
  }

  if (!isRedisAvailable()) {
    logSystemEvent({ level: 'info', source: LOG_SOURCE, message: 'Redis not available, using inline processing mode' }).catch(() => {});
    runStartupBackupSchedulerCatchup();
    return;
  }

  (async (): Promise<void> => {
    if (await isRedisReachable() === false) {
      logSystemEvent({ level: 'warn', source: LOG_SOURCE, message: 'Redis unreachable, skipping BullMQ workers' }).catch(() => {});
      runStartupBackupSchedulerCatchup();
      return;
    }

    const shouldStartKangurSocial = shouldStartKangurSocialQueues();
    const excludedQueueNames = shouldStartKangurSocial ? [...STARTUP_GATED_QUEUE_NAMES] : [...STARTUP_GATED_QUEUE_NAMES, ...KANGUR_SOCIAL_QUEUE_NAMES];

    const queueModules = await Promise.all([
      import('@/server/queues/product-ai'), import('@/server/queues/ai'), import('@/server/queues/ai'),
      import('@/server/queues/ai'), import('@/shared/lib/db/workers/databaseBackupSchedulerQueue'),
      import('@/server/queues/ai'), import('@/server/queues/ai'), import('@/server/queues/integrations'),
      import('@/server/queues/integrations'), import('@/server/queues/integrations'),
      import('@/server/queues/product-sync'), import('@/server/queues/product-sync'),
      import('@/server/queues/product-sync'), import('@/server/queues/case-resolver-ocr'),
      import('@/shared/lib/observability/workers/systemLogAlertsQueue'),
      import('@/server/queues/kangur'), import('@/server/queues/filemaker'),
    ]);

    callSpecializedStartup(queueModules, shouldStartKangurSocial);
    logSystemEvent({ level: 'info', source: LOG_SOURCE, message: 'Starting BullMQ workers...' }).catch(() => {});
    startAllWorkers({ excludeQueueNames: excludedQueueNames });
    startFeatureAwareWorkers(queueModules);

    const { startAiInsightsQueue } = await import('@/server/queues/ai');
    (startAiInsightsQueue as (() => void) | undefined)?.();
  })().catch(() => {});
};

export const testOnly = {
  resetInitialized(): void {
    initialized = false;
  },
};
