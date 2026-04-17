import 'server-only';

import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  TRADERA_SETTINGS_KEYS,
} from '@/features/integrations/constants/tradera';
import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import {
  findDueTraderaRelistListingIds,
  shouldRunTraderaRelistScheduler,
} from '@/features/integrations/services/tradera-listing-service';
import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { createManagedQueue } from '@/shared/lib/queue';
import type { ScheduledTickJobData } from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { enqueueTraderaListingJob } from './traderaListingQueue';

import type { Queue, RepeatableJob } from 'bullmq';

const SCHEDULER_QUEUE_NAME = 'tradera-relist-scheduler';
const SCHEDULER_REPEAT_JOB_ID = 'tradera-relist-scheduler-tick';

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
    const enabled = await shouldRunTraderaRelistScheduler();
    if (enabled === false) return { scheduled: false, count: 0 };

    const dueListingIds = await findDueTraderaRelistListingIds(20);
    
    // Use Promise.all to avoid await in loop
    await Promise.all(dueListingIds.map(processRelistItem));
    
    return { scheduled: true, count: dueListingIds.length };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: 'tradera-relist-scheduler-queue',
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
      service: 'tradera-relist-scheduler-queue',
      action: 'unregisterRepeat',
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
      service: 'tradera-relist-scheduler-queue',
      action: 'stopWorker',
    });
  } finally {
    queueState.workerStarted = false;
  }
};

export const startTraderaRelistSchedulerQueue = (): void => {
  const state = queueState;
  if (state.startupInFlight === true) return;
  state.startupInFlight = true;

  const runStartup = async (): Promise<void> => {
    try {
      const enabled = await shouldRunTraderaRelistScheduler();
      if (enabled === false) {
        await unregisterRepeatScheduler();
        await stopWorkerIfRunning();
        return;
      }

      if (state.workerStarted === false) {
        state.workerStarted = true;
        queue.startWorker();
      }

      const rawInterval = await getSettingValue(TRADERA_SETTINGS_KEYS.schedulerIntervalMs);
      const intervalMs = parseMs(rawInterval, DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerIntervalMs);

      const bullQueue = await ensureBullQueue();
      if (bullQueue !== null) {
        const schedulerRepeatJobs = await listSchedulerRepeatJobs(bullQueue);
        const expectedJobExists = schedulerRepeatJobs.some(
          (repeatJob) =>
            Number(repeatJob.every ?? Number.NaN) === intervalMs &&
            (repeatJob.id === SCHEDULER_REPEAT_JOB_ID ||
              repeatJob.key.includes(SCHEDULER_REPEAT_JOB_ID))
        );
        if (expectedJobExists) {
          state.repeatRegistered = true;
          return;
        }
        if (schedulerRepeatJobs.length > 0) {
          await Promise.all(
            schedulerRepeatJobs.map((repeatJob) => bullQueue.removeRepeatableByKey(repeatJob.key))
          );
          state.repeatRegistered = false;
        }
      } else if (state.repeatRegistered === true) {
        return;
      }

      await queue.enqueue(
        { type: 'scheduled-tick' },
        {
          repeat: { every: intervalMs },
          jobId: SCHEDULER_REPEAT_JOB_ID,
        }
      );
      state.repeatRegistered = true;
    } catch (error) {
      ErrorSystem.captureException(error).catch(() => {});
      state.repeatRegistered = false;
      await ErrorSystem.captureException(error, {
        service: 'tradera-relist-scheduler-queue',
        action: 'registerRepeat',
      });
    } finally {
      state.startupInFlight = false;
    }
  };

  runStartup().catch((error) => {
    state.startupInFlight = false;
    ErrorSystem.captureException(error, {
      service: 'tradera-relist-scheduler-queue',
      action: 'runStartup-failed',
    }).catch(() => {});
  });
};
