import 'server-only';

import type { Queue } from 'bullmq';

import { pipelineProcessor } from './pipeline/processor';
import type {
  RunSocialPublishingPostPipelineInput,
  SocialPublishingManualPipelineJobResult,
} from '@/features/filemaker/social/server/social-posts-pipeline';
import type {
  SocialPublishingManualGenerationJobResult,
  SocialPublishingManualVisualAnalysisJobResult,
} from '@/shared/contracts/social-publishing-pipeline';
import type { SocialPublishingVisualAnalysis } from '@/shared/contracts/social-publishing-posts';
import { createManagedQueue, getRedisConnection, type ManagedQueue } from '@/shared/lib/queue';
import type { SchedulerQueueState } from '@/shared/lib/queue/scheduler-queue-types';
import { safeSetInterval, type SafeTimerId } from '@/shared/lib/timers';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type SocialPublishingPipelineJobData =
  | {
      type: 'pipeline-tick';
    }
  | {
      type: 'manual-post-pipeline';
      input: RunSocialPublishingPostPipelineInput;
    }
  | {
      type: 'manual-post-visual-analysis';
      input: {
        postId?: string | null;
        visionModelId?: string | null;
        imageAddonIds?: string[];
        actorId: string;
      };
    }
  | {
      type: 'manual-post-generation';
      input: {
        postId?: string | null;
        docReferences?: string[];
        notes?: string;
        modelId?: string | null;
        visionModelId?: string | null;
        imageAddonIds?: string[];
        projectUrl?: string;
        prefetchedVisualAnalysis?: SocialPublishingVisualAnalysis;
        requireVisualAnalysisInBody?: boolean;
        actorId: string;
      };
    };

export type SocialPublishingPipelineTickJobResult = {
  type: 'pipeline-tick';
  skipped?: boolean;
  reason?: string;
  addonsCreated?: number;
  failures?: number;
  runId?: string;
};

export type SocialPublishingPipelineJobResult =
  | SocialPublishingPipelineTickJobResult
  | SocialPublishingManualPipelineJobResult
  | SocialPublishingManualVisualAnalysisJobResult
  | SocialPublishingManualGenerationJobResult;

const isPipelineTickResult = (
  result: SocialPublishingPipelineJobResult | null
): result is SocialPublishingPipelineTickJobResult =>
  result?.type === 'pipeline-tick';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const SOCIAL_PUBLISHING_PIPELINE_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['SOCIAL_PUBLISHING_PIPELINE_REPEAT_EVERY_MS'],
  600_000,
  60_000
);

const SOCIAL_PUBLISHING_PIPELINE_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['SOCIAL_PUBLISHING_PIPELINE_LOCK_DURATION_MS'],
  300_000,
  60_000
);

const SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_INTERVAL_MS = parseMsFromEnv(
  process.env['SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_INTERVAL_MS'],
  30_000,
  5_000
);

export const SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_TTL_MS = parseMsFromEnv(
  process.env['SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_TTL_MS'],
  120_000,
  15_000
);

const SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_KEY =
  'social-publishing-pipeline:worker-heartbeat';

type SocialPublishingPipelineQueueState = SchedulerQueueState & {
  heartbeatTimer: SafeTimerId | null;
};

const globalWithQueueState = globalThis as typeof globalThis & {
  __socialPublishingPipelineQueueState__?: SocialPublishingPipelineQueueState;
};

const queueState =
  globalWithQueueState.__socialPublishingPipelineQueueState__ ??
  (globalWithQueueState.__socialPublishingPipelineQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
    heartbeatTimer: null,
  });

const writeSocialPublishingPipelineWorkerHeartbeat = async (): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) return;

  const payload = JSON.stringify({
    heartbeatAt: Date.now(),
    pid: process.pid,
  });

  await redis.set(
    SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_KEY,
    payload,
    'EX',
    Math.ceil(SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_TTL_MS / 1000)
  );
};

export const getSocialPublishingPipelineWorkerHeartbeat = async (): Promise<number | null> => {
  const redis = getRedisConnection();
  if (!redis) return null;

  try {
    const raw = await redis.get(SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_KEY);
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = JSON.parse(raw) as { heartbeatAt?: unknown };
    const heartbeatAt = parsed.heartbeatAt;
    return typeof heartbeatAt === 'number' && Number.isFinite(heartbeatAt)
      ? heartbeatAt
      : null;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'social-publishing-pipeline-queue',
      action: 'readWorkerHeartbeat',
    });
    return null;
  }
};

const startSocialPublishingPipelineWorkerHeartbeat = (): void => {
  if (queueState.heartbeatTimer) return;

  void writeSocialPublishingPipelineWorkerHeartbeat();
  queueState.heartbeatTimer = safeSetInterval(() => {
    void writeSocialPublishingPipelineWorkerHeartbeat();
  }, SOCIAL_PUBLISHING_PIPELINE_WORKER_HEARTBEAT_INTERVAL_MS);
  queueState.heartbeatTimer.unref?.();
};

const queue = createManagedQueue<SocialPublishingPipelineJobData>({
  name: 'social-publishing-pipeline',
  concurrency: 1,
  jobTimeoutMs: 240_000,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
  },
  workerOptions: {
    lockDuration: SOCIAL_PUBLISHING_PIPELINE_LOCK_DURATION_MS,
  },
  processor: pipelineProcessor,
  onCompleted: async (_jobId, result) => {
    const typed = result as SocialPublishingPipelineJobResult | null;
    if (isPipelineTickResult(typed) && typed !== null && typed.skipped === true) {
      void ErrorSystem.logInfo('Social publishing pipeline tick skipped', {
        service: 'social-publishing-pipeline-queue',
        reason: typed.reason ?? 'unknown',
      });
    }
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: 'social-publishing-pipeline-queue',
    });
  },
});

export const enqueueSocialPublishingPipelineJob = async (
  data: SocialPublishingPipelineJobData = { type: 'pipeline-tick' }
): Promise<string> => queue.enqueue(data);

export const getSocialPublishingPipelineQueue = (): ManagedQueue<SocialPublishingPipelineJobData> => queue;

const STALE_ACTIVE_JOB_CLEAN_LIMIT = 20;

export const recoverSocialPublishingPipelineQueue = async (): Promise<string[]> => {
  const status = await queue.getHealthStatus();
  if (status.running || (status.activeCount ?? 0) === 0) {
    return [];
  }

  const rawQueue = queue.getQueue() as Queue | null;
  if (!rawQueue) {
    return [];
  }

  const removedJobIds = await rawQueue.clean(0, STALE_ACTIVE_JOB_CLEAN_LIMIT, 'active');
  if (removedJobIds.length > 0) {
    void ErrorSystem.logInfo('Recovered stale social publishing pipeline active jobs', {
      service: 'social-publishing-pipeline-queue',
      action: 'recoverStaleActiveJobs',
      removedJobIds,
    });
  }
  return removedJobIds;
};

export const startSocialPublishingPipelineQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
    startSocialPublishingPipelineWorkerHeartbeat();
    void ErrorSystem.logInfo('Social publishing pipeline worker started', {
      service: 'social-publishing-pipeline-queue',
      action: 'startWorker',
    });
  }

  if (queueState.schedulerRegistered) return;
  queueState.schedulerRegistered = true;

  void queue
    .enqueue(
      { type: 'pipeline-tick' },
      {
        repeat: { every: SOCIAL_PUBLISHING_PIPELINE_REPEAT_EVERY_MS },
        jobId: 'social-publishing-pipeline-tick',
      }
    )
    .then(() => {
      void ErrorSystem.logInfo('Social publishing pipeline scheduler registered', {
        service: 'social-publishing-pipeline-queue',
        action: 'registerScheduler',
        repeatEveryMs: SOCIAL_PUBLISHING_PIPELINE_REPEAT_EVERY_MS,
      });
    })
    .catch(async (error) => {
      queueState.schedulerRegistered = false;
      await ErrorSystem.captureException(error, {
        service: 'social-publishing-pipeline-queue',
        action: 'registerScheduler',
      });
    });
};
