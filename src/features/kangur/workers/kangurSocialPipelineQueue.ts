import 'server-only';

import type { Queue } from 'bullmq';

import { createKangurSocialImageAddonsBatch } from '@/features/kangur/server/social-image-addons-batch';
import {
  runKangurSocialPostPipeline,
  type RunKangurSocialPostPipelineInput,
  type KangurSocialManualPipelineJobResult,
} from '@/features/kangur/server/social-posts-pipeline';
import { readKangurSettingValue } from '@/features/kangur/services/kangur-settings-repository';
import {
  KANGUR_SOCIAL_SETTINGS_KEY,
  parseKangurSocialSettings,
} from '@/features/kangur/settings-social';
import { createManagedQueue, getRedisConnection, type ManagedQueue } from '@/shared/lib/queue';
import type { SchedulerQueueState } from '@/shared/lib/queue/scheduler-queue-types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type KangurSocialPipelineJobData =
  | {
      type: 'pipeline-tick';
    }
  | {
      type: 'manual-post-pipeline';
      input: RunKangurSocialPostPipelineInput;
    };

export type KangurSocialPipelineTickJobResult = {
  type: 'pipeline-tick';
  skipped?: boolean;
  reason?: string;
  addonsCreated?: number;
  failures?: number;
  runId?: string;
};

export type KangurSocialPipelineJobResult =
  | KangurSocialPipelineTickJobResult
  | KangurSocialManualPipelineJobResult;

const isPipelineTickResult = (
  result: KangurSocialPipelineJobResult | null
): result is KangurSocialPipelineTickJobResult =>
  result?.type === 'pipeline-tick';

const parseMsFromEnv = (raw: string | undefined, fallback: number, min: number): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
};

export const KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS = parseMsFromEnv(
  process.env['KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS'],
  600_000,
  60_000
);

const KANGUR_SOCIAL_PIPELINE_LOCK_DURATION_MS = parseMsFromEnv(
  process.env['KANGUR_SOCIAL_PIPELINE_LOCK_DURATION_MS'],
  300_000,
  60_000
);

const KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_INTERVAL_MS = parseMsFromEnv(
  process.env['KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_INTERVAL_MS'],
  30_000,
  5_000
);

export const KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS = parseMsFromEnv(
  process.env['KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS'],
  120_000,
  15_000
);

const KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_KEY =
  'kangur-social-pipeline:worker-heartbeat';

type KangurSocialPipelineQueueState = SchedulerQueueState & {
  heartbeatTimer: ReturnType<typeof setInterval> | null;
};

const globalWithQueueState = globalThis as typeof globalThis & {
  __kangurSocialPipelineQueueState__?: KangurSocialPipelineQueueState;
};

const queueState =
  globalWithQueueState.__kangurSocialPipelineQueueState__ ??
  (globalWithQueueState.__kangurSocialPipelineQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
    heartbeatTimer: null,
  });

const writeKangurSocialPipelineWorkerHeartbeat = async (): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) return;

  const payload = JSON.stringify({
    heartbeatAt: Date.now(),
    pid: process.pid,
  });

  await redis.set(
    KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_KEY,
    payload,
    'EX',
    Math.ceil(KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_TTL_MS / 1000)
  );
};

export const getKangurSocialPipelineWorkerHeartbeat = async (): Promise<number | null> => {
  const redis = getRedisConnection();
  if (!redis) return null;

  try {
    const raw = await redis.get(KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_KEY);
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
      service: 'kangur-social-pipeline-queue',
      action: 'readWorkerHeartbeat',
    });
    return null;
  }
};

const startKangurSocialPipelineWorkerHeartbeat = (): void => {
  if (queueState.heartbeatTimer) return;

  void writeKangurSocialPipelineWorkerHeartbeat();
  queueState.heartbeatTimer = setInterval(() => {
    void writeKangurSocialPipelineWorkerHeartbeat();
  }, KANGUR_SOCIAL_PIPELINE_WORKER_HEARTBEAT_INTERVAL_MS);
  queueState.heartbeatTimer.unref?.();
};

const queue = createManagedQueue<KangurSocialPipelineJobData>({
  name: 'kangur-social-pipeline',
  concurrency: 1,
  jobTimeoutMs: 240_000,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
  },
  workerOptions: {
    lockDuration: KANGUR_SOCIAL_PIPELINE_LOCK_DURATION_MS,
  },
  processor: async (data, _jobId, signal, helpers) => {
    const startedAt = Date.now();

    if (data.type === 'manual-post-pipeline') {
      const result = await runKangurSocialPostPipeline(data.input, {
        reportProgress: async (progress) => {
          await helpers?.updateProgress(progress);
        },
      });
      void ErrorSystem.logInfo('Kangur social manual pipeline completed', {
        service: 'kangur-social-pipeline-queue',
        postId: result.postId,
        addonsCreated: result.addonsCreated,
        failures: result.failures,
        runId: result.runId,
        durationMs: Date.now() - startedAt,
      });
      return result satisfies KangurSocialPipelineJobResult;
    }

    const raw = await readKangurSettingValue(KANGUR_SOCIAL_SETTINGS_KEY);
    const settings = parseKangurSocialSettings(raw);
    const baseUrl = settings.batchCaptureBaseUrl?.trim();
    if (!baseUrl) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'no_base_url',
      } satisfies KangurSocialPipelineJobResult;
    }

    const presetIds = settings.batchCapturePresetIds;
    if (presetIds.length === 0) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'no_presets',
      } satisfies KangurSocialPipelineJobResult;
    }

    if (signal?.aborted) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'aborted',
      } satisfies KangurSocialPipelineJobResult;
    }

    const result = await createKangurSocialImageAddonsBatch({
      baseUrl,
      presetIds,
      presetLimit: settings.batchCapturePresetLimit ?? null,
      createdBy: 'kangur-social-pipeline-queue',
    });

    void ErrorSystem.logInfo('Kangur social pipeline tick completed', {
      service: 'kangur-social-pipeline-queue',
      addonsCreated: result.addons.length,
      failures: result.failures.length,
      runId: result.runId,
      durationMs: Date.now() - startedAt,
    });

    return {
      type: 'pipeline-tick',
      addonsCreated: result.addons.length,
      failures: result.failures.length,
      runId: result.runId,
    } satisfies KangurSocialPipelineJobResult;
  },
  onCompleted: async (_jobId, result) => {
    const typed = result as KangurSocialPipelineJobResult | null;
    if (isPipelineTickResult(typed) && typed.skipped) {
      void ErrorSystem.logInfo('Kangur social pipeline tick skipped', {
        service: 'kangur-social-pipeline-queue',
        reason: typed.reason,
      });
    }
  },
  onFailed: async (_jobId, error) => {
    await ErrorSystem.captureException(error, {
      service: 'kangur-social-pipeline-queue',
    });
  },
});

export const enqueueKangurSocialPipelineJob = async (
  data: KangurSocialPipelineJobData = { type: 'pipeline-tick' }
): Promise<string> => queue.enqueue(data);

export const getKangurSocialPipelineQueue = (): ManagedQueue<KangurSocialPipelineJobData> => queue;

const STALE_ACTIVE_JOB_CLEAN_LIMIT = 20;

export const recoverKangurSocialPipelineQueue = async (): Promise<string[]> => {
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
    void ErrorSystem.logInfo('Recovered stale Kangur social pipeline active jobs', {
      service: 'kangur-social-pipeline-queue',
      action: 'recoverStaleActiveJobs',
      removedJobIds,
    });
  }
  return removedJobIds;
};

export const startKangurSocialPipelineQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
    startKangurSocialPipelineWorkerHeartbeat();
    void ErrorSystem.logInfo('Kangur social pipeline worker started', {
      service: 'kangur-social-pipeline-queue',
      action: 'startWorker',
    });
  }

  if (queueState.schedulerRegistered) return;
  queueState.schedulerRegistered = true;

  void queue
    .enqueue(
      { type: 'pipeline-tick' },
      {
        repeat: { every: KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS },
        jobId: 'kangur-social-pipeline-tick',
      }
    )
    .then(() => {
      void ErrorSystem.logInfo('Kangur social pipeline scheduler registered', {
        service: 'kangur-social-pipeline-queue',
        action: 'registerScheduler',
        repeatEveryMs: KANGUR_SOCIAL_PIPELINE_REPEAT_EVERY_MS,
      });
    })
    .catch(async (error) => {
      queueState.schedulerRegistered = false;
      await ErrorSystem.captureException(error, {
        service: 'kangur-social-pipeline-queue',
        action: 'registerScheduler',
      });
    });
};
