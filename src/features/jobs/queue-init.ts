import 'server-only';

import {
  startAgentQueue,
  startAiInsightsQueue,
  startAiPathRunQueue,
  startChatbotJobQueue,
  startImageStudioRunQueue,
  startImageStudioSequenceQueue,
} from '@/server/queues/ai';
import { startCaseResolverOcrQueue } from '@/server/queues/case-resolver-ocr';
import {
  startFilemakerEmailCampaignSchedulerQueue,
  startFilemakerSocialPipelineQueue,
  startFilemakerSocialSchedulerQueue,
} from '@/server/queues/filemaker';
import { startFilemakerMailSyncSchedulerQueue } from '@/features/filemaker/workers/filemakerMailSyncSchedulerQueue';
import { startFilemakerMailIdleManager } from '@/features/filemaker/workers/filemakerMailIdleManager';
import { startFilemakerCampaignColdPruneSchedulerQueue } from '@/features/filemaker/workers/filemakerCampaignColdPruneSchedulerQueue';
import { startFilemakerJobBoardScrapeQueue } from '@/features/filemaker/server/filemaker-job-board-scrape-runtime';
import {
  startPlaywrightListingQueue,
  startTraderaListingQueue,
  startVintedListingQueue,
} from '@/server/queues/integrations';
import {
  startTraderaRelistSchedulerQueue,
} from '@/features/integrations/workers/traderaRelistSchedulerQueue';
import { startProductAiJobQueue } from '@/server/queues/product-ai';
import { startProductMarketplaceCopyDebrandBatchQueue } from '@/server/queues/products';
import { startProductSyncSchedulerQueue } from '@/server/queues/product-sync';
import { startDatabaseBackupSchedulerQueue } from '@/shared/lib/db/workers/databaseBackupSchedulerQueue';
import { startSystemLogAlertsQueue } from '@/shared/lib/observability/workers/systemLogAlertsQueue';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { isRedisAvailable, isRedisReachable } from '@/shared/lib/queue/redis-connection';
import { startAllWorkers } from '@/shared/lib/queue/registry';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


let initialized = false;
let initializing = false;
const LOG_SOURCE = 'queue-init';
type QueueStarter = () => void;
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
  'product-marketplace-copy-debrand-batch',
] as const;
const SOCIAL_PUBLISHING_QUEUE_NAMES = [
  'social-publishing-scheduler',
  'social-publishing-pipeline',
] as const;
const SPECIALIZED_STARTERS = [
  startDatabaseBackupSchedulerQueue,
  startTraderaRelistSchedulerQueue,
  startProductSyncSchedulerQueue,
  startSystemLogAlertsQueue,
  startFilemakerEmailCampaignSchedulerQueue,
  startFilemakerMailSyncSchedulerQueue,
  startFilemakerMailIdleManager,
  startFilemakerCampaignColdPruneSchedulerQueue,
] as const satisfies readonly QueueStarter[];
const SOCIAL_PUBLISHING_STARTERS = [
  startFilemakerSocialSchedulerQueue,
  startFilemakerSocialPipelineQueue,
] as const satisfies readonly QueueStarter[];
const FEATURE_AWARE_STARTERS = [
  startPlaywrightListingQueue,
  startTraderaListingQueue,
  startVintedListingQueue,
  startProductAiJobQueue,
  startAiPathRunQueue,
  startChatbotJobQueue,
  startAgentQueue,
  startImageStudioRunQueue,
  startImageStudioSequenceQueue,
  startCaseResolverOcrQueue,
  startFilemakerJobBoardScrapeQueue,
  startProductMarketplaceCopyDebrandBatchQueue,
] as const satisfies readonly QueueStarter[];

const parseEnvBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return null;
};

export const shouldStartSocialPublishingQueues = (
  env: NodeJS.ProcessEnv = process.env
): boolean => {
  if (parseEnvBoolean(env['DISABLE_SOCIAL_PUBLISHING_WORKERS']) === true) {
    return false;
  }

  const explicitEnable = parseEnvBoolean(env['ENABLE_SOCIAL_PUBLISHING_WORKERS']);
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

const callSpecializedStartup = (
  shouldStartSocialPublishing: boolean
): void => {
  for (const starter of SPECIALIZED_STARTERS) {
    starter();
  }

  if (shouldStartSocialPublishing) {
    for (const starter of SOCIAL_PUBLISHING_STARTERS) {
      starter();
    }
  } else {
    logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: 'Social publishing workers are disabled for this environment. Set ENABLE_SOCIAL_PUBLISHING_WORKERS=true to enable them.',
      context: { queueNames: [...SOCIAL_PUBLISHING_QUEUE_NAMES] },
    }).catch(() => {});
  }
};

const startFeatureAwareWorkers = (): void => {
  for (const starter of FEATURE_AWARE_STARTERS) {
    starter();
  }
};

export const initializeQueues = (): void => {
  if (initialized || initializing) return;

  if (process.env['DISABLE_QUEUE_WORKERS'] === 'true') {
    initialized = true;
    logSystemEvent({ level: 'info', source: LOG_SOURCE, message: 'Worker startup disabled by DISABLE_QUEUE_WORKERS' }).catch(() => {});
    runStartupBackupSchedulerCatchup();
    return;
  }

  if (!isRedisAvailable()) {
    logSystemEvent({ level: 'info', source: LOG_SOURCE, message: 'Redis not available, using inline processing mode' }).catch(() => {});
    runStartupBackupSchedulerCatchup();
    return;
  }

  initializing = true;
  (async (): Promise<void> => {
    try {
      if (await isRedisReachable() === false) {
        logSystemEvent({ level: 'warn', source: LOG_SOURCE, message: 'Redis unreachable, skipping BullMQ workers' }).catch(() => {});
        runStartupBackupSchedulerCatchup();
        return;
      }

      const shouldStartSocialPublishing = shouldStartSocialPublishingQueues();
      const excludedQueueNames = shouldStartSocialPublishing ? [...STARTUP_GATED_QUEUE_NAMES] : [...STARTUP_GATED_QUEUE_NAMES, ...SOCIAL_PUBLISHING_QUEUE_NAMES];

      callSpecializedStartup(shouldStartSocialPublishing);
      logSystemEvent({ level: 'info', source: LOG_SOURCE, message: 'Starting BullMQ workers...' }).catch(() => {});
      startAllWorkers({ excludeQueueNames: excludedQueueNames });
      startFeatureAwareWorkers();

      if (isQueueStarter(startAiInsightsQueue)) {
        startAiInsightsQueue();
      }

      initialized = true;
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => {});
      logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: 'BullMQ worker startup failed',
        error,
      }).catch(() => {});
    } finally {
      initializing = false;
    }
  })().catch(() => {});
};

export const testOnly = {
  resetInitialized(): void {
    initialized = false;
    initializing = false;
  },
};
