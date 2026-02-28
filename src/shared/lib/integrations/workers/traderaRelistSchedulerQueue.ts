import 'server-only';

import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  TRADERA_SETTINGS_KEYS,
} from '@/shared/lib/integrations/constants/tradera';
import { findProductListingByIdAcrossProviders } from '@/shared/lib/integrations/server';
import {
  findDueTraderaRelistListingIds,
  shouldRunTraderaRelistScheduler,
} from '@/shared/lib/integrations/services/tradera-listing-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { getSettingValue } from '@/features/products/server';
import { createManagedQueue } from '@/shared/lib/queue';

import { enqueueTraderaListingJob } from './traderaListingQueue';

type TraderaRelistSchedulerJobData = {
  type: 'scheduled-tick';
};

const parseMs = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(30_000, Math.floor(parsed));
};

const queue = createManagedQueue<TraderaRelistSchedulerJobData>({
  name: 'tradera-relist-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async () => {
    const enabled = await shouldRunTraderaRelistScheduler();
    if (!enabled) return { scheduled: false, count: 0 };

    const dueListingIds = await findDueTraderaRelistListingIds(20);
    for (const listingId of dueListingIds) {
      const resolved = await findProductListingByIdAcrossProviders(listingId);
      if (resolved) {
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
    }
    return { scheduled: true, count: dueListingIds.length };
  },
  onFailed: async (_jobId, error) => {
    await (ErrorSystem as any).captureException(error, {
      service: 'tradera-relist-scheduler-queue',
    });
  },
});

let started = false;
let repeatRegistered = false;

export const startTraderaRelistSchedulerQueue = (): void => {
  if (!started) {
    started = true;
    queue.startWorker();
  }

  if (repeatRegistered) return;
  repeatRegistered = true;

  void (async (): Promise<void> => {
    const rawInterval = await getSettingValue(TRADERA_SETTINGS_KEYS.schedulerIntervalMs);
    const intervalMs = parseMs(rawInterval, DEFAULT_TRADERA_SYSTEM_SETTINGS.schedulerIntervalMs);
    await queue.enqueue(
      { type: 'scheduled-tick' },
      {
        repeat: { every: intervalMs },
        jobId: 'tradera-relist-scheduler-tick',
      }
    );
  })().catch(async (error) => {
    repeatRegistered = false;
    await (ErrorSystem as any).captureException(error, {
      service: 'tradera-relist-scheduler-queue',
      action: 'registerRepeat',
    });
  });
};
