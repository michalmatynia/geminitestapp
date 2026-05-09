import 'server-only';

import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  TRADERA_SETTINGS_KEYS,
} from '@/features/integrations/constants/tradera';
import { findProductListingByIdAcrossProviders } from '@/features/integrations/services/product-listing-repository';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { createManagedQueue } from '@/shared/lib/queue';
import type { ScheduledTickJobData } from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Builds a standardized source string for logging: 'integrations.tradera-relist.<action>'
 */
const buildTraderaRelistSource = (action: string): string => `integrations.tradera-relist.${action}`;

import { enqueueTraderaListingJob } from './traderaListingQueue';

import type { Queue, RepeatableJob } from 'bullmq';

const SCHEDULER_QUEUE_NAME = 'tradera-relist-scheduler';
const SCHEDULER_REPEAT_JOB_ID = 'tradera-relist-scheduler-tick';

type TraderaRelistSchedulerServiceModule = {
  findDueTraderaRelistListingIds: (limit: number) => Promise<string[]>;
  shouldRunTraderaRelistScheduler: () => Promise<boolean>;
};

const loadTraderaRelistSchedulerService =
  async (): Promise<TraderaRelistSchedulerServiceModule> =>
    import('../services/' + 'tradera-listing-service') as Promise<TraderaRelistSchedulerServiceModule>;

const parseMs = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) === false) return fallback;
  return Math.max(30_000, Math.floor(parsed));
};

const processRelistItem = async (listingId: string): Promise<void> => {
  const resolved = await findProductListingByIdAcrossProviders(listingId);
  if (resolved !== null) {
    await resolved.repository.updateListingStatus(listingId, 'queued_relist');
    await resolved.repository.updateListing(listingId, {
      nextRelistAt: null,
      lastStatusCheckAt: new Date(),
    });
  }
  await enqueueTraderaListingJob({
    listingId,
    action: 'relist',
    source: 'scheduler',
  });
};

const queue = createManagedQueue<ScheduledTickJobData>({
  name: SCHEDULER_QUEUE_NAME,
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async () => {
    const {
      shouldRunTraderaRelistScheduler,
      findDueTraderaRelistListingIds,
    } = await loadTraderaRelistSchedulerService();
    const enabled = await shouldRunTraderaRelistScheduler();
    if (enabled === false) return { scheduled: false, count: 0 };

    const dueListingIds = await findDueTraderaRelistListingIds(20);
    
    // Use Promise.all to avoid await in loop
    await Promise.all(dueListingIds.map(processRelistItem));
    
    return { scheduled: true, count: dueListingIds.length };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: buildTraderaRelistSource('failed'),
    });
  },
});

type TraderaRelistSchedulerQueueState = {
  workerStarted: boolean;
  repeatRegistered: boolean;
  startupInFlight: boolean;
};

const globalWithQueueState = globalThis as typeof globalThis & {
  __traderaRelistSchedulerQueueState__?: TraderaRelistSchedulerQueueState;
};

const queueState =
  globalWithQueueState.__traderaRelistSchedulerQueueState__ ??
  (globalWithQueueState.__traderaRelistSchedulerQueueState__ = {
    workerStarted: false,
    repeatRegistered: false,
    startupInFlight: false,
  });

const ensureBullQueue = async (): Promise<Queue | null> => {
  const current = (queue.getQueue() ?? null) as Queue | null;
  if (current !== null) return current;

  await queue.getHealthStatus().catch(() => null);
  return (queue.getQueue() ?? null) as Queue | null;
};

const listSchedulerRepeatJobs = async (bullQueue: Queue): Promise<RepeatableJob[]> => {
  const repeatableJobs = await bullQueue.getRepeatableJobs(0, -1, true);
  return repeatableJobs.filter((job) => job.name === SCHEDULER_QUEUE_NAME);
};

const unregisterRepeatScheduler = async (): Promise<void> => {
  try {
    const bullQueue = await ensureBullQueue();
    if (bullQueue === null) {
      queueState.repeatRegistered = false;
      return;
    }

    const schedulerRepeatJobs = await listSchedulerRepeatJobs(bullQueue);
    await Promise.all(
      schedulerRepeatJobs.map((repeatJob) => bullQueue.removeRepeatableByKey(repeatJob.key))
    );
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => {});
    await ErrorSystem.captureException(error, {
      service: buildTraderaRelistSource('unregister-repeat-failed'),
    });
  } finally {
    queueState.repeatRegistered = false;
  }
};

const stopWorkerIfRunning = async (): Promise<void> => {
  if (queueState.workerStarted === false && queue.getQueue() === null) return;
  try {
    await queue.stopWorker();
  } catch (error) {
    ErrorSystem.captureException(error).catch(() => {});
    await ErrorSystem.captureException(error, {
      service: buildTraderaRelistSource('stop-worker-failed'),
    });
  } finally {
    queueState.workerStarted = false;
  }
};

export const startTraderaRelistSchedulerQueue = (): void => {
  if (queueState.startupInFlight === true) return;
  queueState.startupInFlight = true;
  
  const runStartup = async (): Promise<void> => {
    try {
      const { shouldRunTraderaRelistScheduler } =
        await loadTraderaRelistSchedulerService();
      if ((await shouldRunTraderaRelistScheduler()) === false) {
        await unregisterRepeatScheduler();
        await stopWorkerIfRunning();
        Object.assign(queueState, { workerStarted: false, repeatRegistered: false, startupInFlight: false });
        return;
      }

      // Check the current state *after* potentially awaiting above
      if (queueState.workerStarted === false) {
        queueState.workerStarted = true;
        queue.startWorker();
      }

      const rawInterval = await getSettingValue(TRADERA_SETTINGS_KEYS.schedulerIntervalMs);
      const intervalMs = parseMs(rawInterval, DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerIntervalMs);

      const bullQueue = await ensureBullQueue();
      if (bullQueue !== null) {
        const schedulerRepeatJobs = await listSchedulerRepeatJobs(bullQueue);
        const isMatch = (rj: RepeatableJob): boolean =>
          Number(rj.every ?? Number.NaN) === intervalMs &&
          (rj.id === SCHEDULER_REPEAT_JOB_ID || rj.key.includes(SCHEDULER_REPEAT_JOB_ID));

        if (schedulerRepeatJobs.some(isMatch)) {
          Object.assign(queueState, { repeatRegistered: true, startupInFlight: false });
          return;
        }
        if (schedulerRepeatJobs.length > 0) {
          await Promise.all(schedulerRepeatJobs.map((rj) => bullQueue.removeRepeatableByKey(rj.key)));
          queueState.repeatRegistered = false;
        }
      } else if (queueState.repeatRegistered === true) {
        queueState.startupInFlight = false;
        return;
      }

      await queue.enqueue({ type: 'scheduled-tick' }, { repeat: { every: intervalMs }, jobId: SCHEDULER_REPEAT_JOB_ID });
      Object.assign(queueState, { repeatRegistered: true, startupInFlight: false });
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => {});
      Object.assign(queueState, { repeatRegistered: false, startupInFlight: false });
      await ErrorSystem.captureException(error, { service: buildTraderaRelistSource('register-repeat-failed') });
    }
  };

  runStartup().catch((error) => {
    queueState.startupInFlight = false;
    ErrorSystem.captureException(error, {
      service: buildTraderaRelistSource('run-startup-failed'),
    }).catch(() => {});
  });
};
