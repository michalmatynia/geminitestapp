import 'server-only';

import { publishDueScheduledSocialPublishingPosts } from '@/features/filemaker/social/server/social-posts-publish';
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

export const SOCIAL_PUBLISHING_SCHEDULER_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['SOCIAL_PUBLISHING_SCHEDULER_REPEAT_EVERY_MS'],
  60_000,
  30_000
);

const SOCIAL_PUBLISHING_SCHEDULER_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['SOCIAL_PUBLISHING_SCHEDULER_LOCK_DURATION_MS'],
  60_000,
  30_000
);

const globalWithQueueState = globalThis as typeof globalThis & {
  __socialPublishingSchedulerQueueState__?: SchedulerQueueState;
};

const queueState =
  globalWithQueueState.__socialPublishingSchedulerQueueState__ ??
  (globalWithQueueState.__socialPublishingSchedulerQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

const queue = createManagedQueue<ScheduledTickJobData>({
  name: 'social-publishing-scheduler',
  concurrency: 1,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
  workerOptions: {
    lockDuration: SOCIAL_PUBLISHING_SCHEDULER_LOCK_DURATION_MS,
  },
  processor: async () => {
    const startedAt = Date.now();
    const published = await publishDueScheduledSocialPublishingPosts();
    if (published.length > 0) {
      await ErrorSystem.logInfo('Social publishing scheduler tick processed', {
        service: 'social-publishing-scheduler-queue',
        published: published.length,
        postIds: published.map((post) => post.id),
        durationMs: Date.now() - startedAt,
      });
    }
    return { published: published.length };
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: 'social-publishing-scheduler-queue',
    });
  },
});

export const startSocialPublishingSchedulerQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
    void ErrorSystem.logInfo('Social publishing scheduler worker started', {
      service: 'social-publishing-scheduler-queue',
      action: 'startWorker',
    });
  }

  if (queueState.schedulerRegistered) return;
  queueState.schedulerRegistered = true;

  void queue
    .enqueue(
      { type: 'scheduled-tick' },
      {
        repeat: { every: SOCIAL_PUBLISHING_SCHEDULER_REPEAT_EVERY_MS },
        jobId: 'social-publishing-scheduler-tick',
      }
    )
    .then(() => {
      void ErrorSystem.logInfo('Social publishing scheduler registered', {
        service: 'social-publishing-scheduler-queue',
        action: 'registerScheduler',
        repeatEveryMs: SOCIAL_PUBLISHING_SCHEDULER_REPEAT_EVERY_MS,
      });
    })
    .catch(async (error) => {
      queueState.schedulerRegistered = false;
      await ErrorSystem.captureException(error, {
        service: 'social-publishing-scheduler-queue',
        action: 'registerScheduler',
      });
    });
};
