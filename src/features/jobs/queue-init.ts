import 'server-only';

import { createRequire } from 'module';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


let initialized = false;
const LOG_SOURCE = 'queue-init';
type QueueStarter = () => void;
type QueueStartupModule = Record<string, unknown>;
type QueueStartupExport = readonly [index: number, exportName: string];
const queueStartupRequire = createRequire(import.meta.url);
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
const SPECIALIZED_STARTUP_EXPORTS = [
  [4, 'startDatabaseBackupSchedulerQueue'],
  [8, 'startTraderaRelistSchedulerQueue'],
  [12, 'startProductSyncSchedulerQueue'],
  [14, 'startSystemLogAlertsQueue'],
  [16, 'startFilemakerEmailCampaignSchedulerQueue'],
] as const satisfies readonly QueueStartupExport[];
const KANGUR_SOCIAL_STARTUP_EXPORTS = [
  [15, 'startKangurSocialSchedulerQueue'],
  [15, 'startKangurSocialPipelineQueue'],
] as const satisfies readonly QueueStartupExport[];
const FEATURE_AWARE_STARTUP_EXPORTS = [
  [0, 'startProductAiJobQueue'],
  [1, 'startAiPathRunQueue'],
  [2, 'startChatbotJobQueue'],
  [3, 'startAgentQueue'],
  [5, 'startImageStudioRunQueue'],
  [6, 'startImageStudioSequenceQueue'],
  [13, 'startCaseResolverOcrQueue'],
] as const satisfies readonly QueueStartupExport[];

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

const isQueueStarter = (value: unknown): value is QueueStarter =>
  typeof value === 'function';

const loadQueueStartupModule = (modulePath: string): QueueStartupModule =>
  queueStartupRequire(modulePath) as QueueStartupModule;

const callQueueStarter = (
  queueModules: readonly QueueStartupModule[],
  index: number,
  exportName: string
): void => {
  const starter = queueModules[index]?.[exportName];
  if (isQueueStarter(starter)) starter();
};

const callQueueStarters = (
  queueModules: readonly QueueStartupModule[],
  startupExports: readonly QueueStartupExport[]
): void => {
  for (const [index, exportName] of startupExports) {
    callQueueStarter(queueModules, index, exportName);
  }
};

const callSpecializedStartup = (
  queueModules: readonly QueueStartupModule[],
  shouldStartKangurSocial: boolean
): void => {
  callQueueStarters(queueModules, SPECIALIZED_STARTUP_EXPORTS);

  if (shouldStartKangurSocial) {
    callQueueStarters(queueModules, KANGUR_SOCIAL_STARTUP_EXPORTS);
  } else {
    logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Kangur social workers are disabled for this environment. Set ENABLE_KANGUR_SOCIAL_WORKERS=true to enable them.',
      context: { queueNames: [...KANGUR_SOCIAL_QUEUE_NAMES] },
    }).catch(() => {});
  }
};

const startFeatureAwareWorkers = (
  queueModules: readonly QueueStartupModule[]
): void => callQueueStarters(queueModules, FEATURE_AWARE_STARTUP_EXPORTS);

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

    const queueModules = [
      loadQueueStartupModule('../../server/queues/product-ai'),
      loadQueueStartupModule('../../server/queues/ai'),
      loadQueueStartupModule('../../server/queues/ai'),
      loadQueueStartupModule('../../server/queues/ai'),
      loadQueueStartupModule('../../shared/lib/db/workers/databaseBackupSchedulerQueue'),
      loadQueueStartupModule('../../server/queues/ai'),
      loadQueueStartupModule('../../server/queues/ai'),
      loadQueueStartupModule('../../server/queues/integrations'),
      loadQueueStartupModule('../../server/queues/integrations'),
      loadQueueStartupModule('../../server/queues/integrations'),
      loadQueueStartupModule('../../server/queues/product-sync'),
      loadQueueStartupModule('../../server/queues/product-sync'),
      loadQueueStartupModule('../../server/queues/product-sync'),
      loadQueueStartupModule('../../server/queues/case-resolver-ocr'),
      loadQueueStartupModule('../../shared/lib/observability/workers/systemLogAlertsQueue'),
      loadQueueStartupModule('../../server/queues/kangur'),
      loadQueueStartupModule('../../server/queues/filemaker'),
    ] as const satisfies readonly QueueStartupModule[];

    callSpecializedStartup(queueModules, shouldStartKangurSocial);
    logSystemEvent({ level: 'info', source: LOG_SOURCE, message: 'Starting BullMQ workers...' }).catch(() => {});
    startAllWorkers({ excludeQueueNames: excludedQueueNames });
    startFeatureAwareWorkers(queueModules);

    const startAiInsightsQueue = loadQueueStartupModule('../../server/queues/ai')[
      'startAiInsightsQueue'
    ];
    if (isQueueStarter(startAiInsightsQueue)) {
      startAiInsightsQueue();
    }
  })().catch(() => {});
};

export const testOnly = {
  resetInitialized(): void {
    initialized = false;
  },
};
