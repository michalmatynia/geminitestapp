import 'server-only';

import { publishDueScheduledKangurSocialPosts } from '@/features/kangur/social/server/social-posts-publish';
import { createManagedQueue } from '@/shared/lib/queue';
import type {
  ScheduledTickJobData,
  SchedulerQueueState,
} from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const KANGUR_SOCIAL_SCHEDULER_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['KANGUR_SOCIAL_SCHEDULER_REPEAT_EVERY_MS'],
  60_000,
  30_000
);

const KANGUR_SOCIAL_SCHEDULER_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['KANGUR_SOCIAL_SCHEDULER_LOCK_DURATION_MS'],
  60_000,
  30_000
);

const globalWithQueueState = globalThis as typeof globalThis & {
  __kangurSocialSchedulerQueueState__?: SchedulerQueueState;
};

const queueState =
  globalWithQueueState.__kangurSocialSchedulerQueueState__ ??
  (globalWithQueueState.__kangurSocialSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<ScheduledTickJobData>({
  name: 'kangur-social-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: KANGUR_SOCIAL_SCHEDULER_LOCK_DURATION_MS,
  },
  processor: async () => {
    const startedAt = Date.now();
    const published = await publishDueScheduledKangurSocialPosts();
    if (published.length > 0) {
      await ErrorSystem.logInfo('Kangur social scheduler tick processed', {
        service: 'kangur-social-scheduler-queue',
        published: published.length,
        postIds: published.map((post) => post.id),
        durationMs: Date.now() - startedAt,
      });
    }
    return { published: published.length };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: 'kangur-social-scheduler-queue',
    });
  },
});

export const startKangurSocialSchedulerQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
    void ErrorSystem.logInfo('Kangur social scheduler worker started', {
      service: 'kangur-social-scheduler-queue',
      action: 'startWorker',
    });
  }

  if (queueState.schedulerRegistered) return;
  queueState.schedulerRegistered = true;

  void queue
    .enqueue(
      { type: 'scheduled-tick' },
      {
        repeat: { every: KANGUR_SOCIAL_SCHEDULER_REPEAT_EVERY_MS },
        jobId: 'kangur-social-scheduler-tick',
      }
    )
    .then(() => {
      void ErrorSystem.logInfo('Kangur social scheduler registered', {
        service: 'kangur-social-scheduler-queue',
        action: 'registerScheduler',
        repeatEveryMs: KANGUR_SOCIAL_SCHEDULER_REPEAT_EVERY_MS,
      });
    })
    .catch(async (error) => {
      queueState.schedulerRegistered = false;
      await ErrorSystem.captureException(error, {
        service: 'kangur-social-scheduler-queue',
        action: 'registerScheduler',
      });
    });
};
