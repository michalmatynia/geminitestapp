import 'server-only';

import { type AiPathRunQueueStatus } from '@/shared/contracts/ai-paths-runtime';
import { serviceUnavailableError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  getAiPathsEnabledCached,
  assertAiPathsEnabled,
  clearAiPathsEnabledCache as resetAiPathsEnabledCache,
} from './ai-path-run-queue/brain-gate';
import {
  AI_PATH_RUN_QUEUE_NAME,
  LOG_SOURCE,
  REQUIRE_DURABLE_QUEUE,
  QUEUE_HOT_WAITING_LIMIT,
  QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
} from './ai-path-run-queue/config';
import { queue, enqueuePathRunJob } from './ai-path-run-queue/queue';
import {
  aiPathRunQueueState,
  localFallbackTimers,
  setLocalFallbackTimer,
} from './ai-path-run-queue/state';
import {
  getAiPathRunQueueStatus,
  getAiPathRunQueueHotStatus,
  clearAiPathRunQueueStatusCache,
} from './ai-path-run-queue/status';
import { type AiPathRunQueueHotStatus } from './ai-path-run-queue/types';
import { createDebugQueueLogger } from './ai-path-run-queue-utils';


export {
  getAiPathRunQueueStatus,
  getAiPathRunQueueHotStatus,
  assertAiPathsEnabled,
  enqueuePathRunJob,
};

export const TEST_ONLY = {
  clearAiPathsEnabledCache: (): void => {
    resetAiPathsEnabledCache();
    clearAiPathRunQueueStatusCache();
  },
};

const { warn: debugQueueWarn } = createDebugQueueLogger(
  LOG_SOURCE,
  process.env['AI_PATHS_QUEUE_DEBUG'] === 'true'
);

let reconcileInFlight: Promise<void> | null = null;

type QueueJobRemovalApi = {
  remove: () => Promise<void>;
};

type QueueJobLookupApi = {
  getJob: (jobId: string) => Promise<QueueJobRemovalApi | null>;
};

const hasJobLookupQueueApi = (value: unknown): value is QueueJobLookupApi =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { getJob?: unknown }).getJob === 'function';

const stopAiPathRunQueueInternal = async (): Promise<void> => {
  if (!aiPathRunQueueState.workerStarted) return;
  await queue.stopWorker();
  aiPathRunQueueState.workerStarted = false;
};

export const startAiPathRunQueue = (): void => {
  if (reconcileInFlight) return;
  reconcileInFlight = (async (): Promise<void> => {
    let enabled: boolean;
    try {
      enabled = await getAiPathsEnabledCached();
    } catch (error) {
      void ErrorSystem.captureException(error);
      void ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        action: 'validateBrainGate',
      });
      return;
    }

    if (!enabled) {
      await stopAiPathRunQueueInternal().catch((error) => {
        void ErrorSystem.captureException(error, {
          service: LOG_SOURCE,
          action: 'stopWorker',
        });
      });
      return;
    }

    if (!aiPathRunQueueState.workerStarted) {
      queue.startWorker();
      aiPathRunQueueState.workerStarted = true;

      void (async (): Promise<void> => {
        try {
          const { getMongoClient } = await import('@/shared/lib/db/mongo-client');
          await getMongoClient();
        } catch (error) {
          void ErrorSystem.captureException(error);
        
          // Advisory only
        }
      })();
    }
  })().finally(() => {
    reconcileInFlight = null;
  });
};

const waitForQueueReconciliation = async (): Promise<void> => {
  if (!reconcileInFlight) return;
  await reconcileInFlight;
};

export const assertAiPathRunQueueReady = async (): Promise<AiPathRunQueueStatus> => {
  const aiPathsEnabled = await getAiPathsEnabledCached().catch(() => false);
  if (!aiPathsEnabled) {
    throw serviceUnavailableError(
      'AI Paths execution is disabled in Brain settings. Enable AI Paths and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { feature: 'ai_paths' }
    );
  }

  startAiPathRunQueue();
  await waitForQueueReconciliation();

  const status = await getAiPathRunQueueStatus();
  if (status.running) return status;

  if (!REQUIRE_DURABLE_QUEUE) {
    debugQueueWarn(
      '[aiPathRunQueue] Worker not running, but durable queue is not required; allowing local fallback execution.',
      {
        queueRunning: status.running,
        queueHealthy: status.healthy,
        queuedCount: status.queuedCount,
      }
    );
    return status;
  }

  throw serviceUnavailableError(
    'AI Paths queue worker is unavailable. Please retry in a few seconds.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      queueRunning: status.running,
      queueHealthy: status.healthy,
      queuedCount: status.queuedCount,
      activeRuns: status.activeRuns,
    }
  );
};

export const assertAiPathRunQueueReadyForEnqueue = async (): Promise<AiPathRunQueueHotStatus> => {
  const aiPathsEnabled = await getAiPathsEnabledCached().catch(() => false);
  if (!aiPathsEnabled) {
    throw serviceUnavailableError(
      'AI Paths execution is disabled in Brain settings. Enable AI Paths and retry.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      { feature: 'ai_paths' }
    );
  }

  if (!aiPathRunQueueState.workerStarted) {
    startAiPathRunQueue();
    await waitForQueueReconciliation();
  }
  const status = await getAiPathRunQueueHotStatus();
  if (status.waitingRuns >= QUEUE_HOT_WAITING_LIMIT) {
    throw serviceUnavailableError(
      'AI Paths queue is currently saturated. Please retry in a few seconds.',
      QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
      {
        queueWaitingRuns: status.waitingRuns,
        queueWaitingLimit: QUEUE_HOT_WAITING_LIMIT,
      }
    );
  }
  if (status.running) return status;

  if (!REQUIRE_DURABLE_QUEUE) {
    debugQueueWarn(
      '[aiPathRunQueue] Worker not running, but durable queue is not required; allowing local fallback execution.',
      {
        queueRunning: status.running,
        queueHealthy: status.healthy,
      }
    );
    return status;
  }

  throw serviceUnavailableError(
    'AI Paths queue worker is unavailable. Please retry in a few seconds.',
    QUEUE_UNAVAILABLE_RETRY_AFTER_MS,
    {
      queueRunning: status.running,
      queueHealthy: status.healthy,
    }
  );
};

export const scheduleLocalFallbackRun = (runId: string, delayMs: number): void => {
  const timer = setTimeout(() => {
    void (async () => {
      localFallbackTimers.delete(runId);
      try {
        const [{ getPathRunRepository }, { processRun }] = await Promise.all([
          import('@/shared/lib/ai-paths/services/path-run-repository'),
          import('@/features/ai/ai-paths/workers/ai-path-run-processor'),
        ]);
        const repo = await getPathRunRepository();
        const run = await repo.claimRunForProcessing(runId);
        if (!run) return;
        await processRun(run);
      } catch (error) {
        void ErrorSystem.captureException(error);
        void ErrorSystem.captureException(error, {
          service: LOG_SOURCE,
          action: 'localFallbackExecution',
          runId,
        });
      }
    })();
  }, delayMs);

  setLocalFallbackTimer(runId, timer);
};

export const cancelLocalFallbackRun = (runId: string): void => {
  const timer = localFallbackTimers.get(runId);
  if (timer) {
    clearTimeout(timer);
    localFallbackTimers.delete(runId);
  }
};

export const removePathRunQueueEntries = async (
  runIds: string[]
): Promise<{ requested: number; removed: number }> => {
  const uniqueRunIds = Array.from(
    new Set(
      runIds
        .map((runId: string): string => runId.trim())
        .filter((runId: string): boolean => runId.length > 0)
    )
  );
  if (uniqueRunIds.length === 0) return { requested: 0, removed: 0 };

  let removed = 0;

  uniqueRunIds.forEach((runId: string) => {
    if (localFallbackTimers.has(runId)) {
      removed += 1;
    }
    cancelLocalFallbackRun(runId);
  });

  const queueApi = queue.getQueue();
  if (!hasJobLookupQueueApi(queueApi)) {
    return { requested: uniqueRunIds.length, removed };
  }

  await Promise.all(
    uniqueRunIds.map(async (runId: string) => {
      try {
        const job = await queueApi.getJob(runId);
        if (!job) return;
        await job.remove();
        removed += 1;
      } catch (error) {
        void ErrorSystem.captureException(error);
        void ErrorSystem.logWarning(`Non-critical queue removal failure for run ${runId}`, {
          service: LOG_SOURCE,
          action: 'removePathRunQueueEntries',
          runId,
          error,
        });
      }
    })
  );

  return { requested: uniqueRunIds.length, removed };
};
