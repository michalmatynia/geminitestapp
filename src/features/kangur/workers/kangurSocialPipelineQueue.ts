import 'server-only';

import { createKangurSocialImageAddonsBatch } from '@/features/kangur/server/social-image-addons-batch';
import { readKangurSettingValue } from '@/features/kangur/services/kangur-settings-repository';
import {
  KANGUR_SOCIAL_SETTINGS_KEY,
  parseKangurSocialSettings,
} from '@/features/kangur/settings-social';
import { createManagedQueue, type ManagedQueue } from '@/shared/lib/queue';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export type KangurSocialPipelineJobData = {
  type: 'pipeline-tick';
};

export type KangurSocialPipelineJobResult = {
  skipped?: boolean;
  reason?: string;
  addonsCreated?: number;
  failures?: number;
  runId?: string;
};

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

type KangurSocialPipelineQueueState = {
  workerStarted: boolean;
  schedulerRegistered: boolean;
};

const globalWithQueueState = globalThis as typeof globalThis & {
  __kangurSocialPipelineQueueState__?: KangurSocialPipelineQueueState;
};

const queueState =
  globalWithQueueState.__kangurSocialPipelineQueueState__ ??
  (globalWithQueueState.__kangurSocialPipelineQueueState__ = {
    workerStarted: false,
    schedulerRegistered: false,
  });

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
  processor: async (_data, _jobId, signal) => {
    const startedAt = Date.now();

    const raw = await readKangurSettingValue(KANGUR_SOCIAL_SETTINGS_KEY);
    const settings = parseKangurSocialSettings(raw);
    const baseUrl = settings.batchCaptureBaseUrl?.trim();
    if (!baseUrl) {
      return { skipped: true, reason: 'no_base_url' } satisfies KangurSocialPipelineJobResult;
    }

    const presetIds = settings.batchCapturePresetIds;
    if (presetIds.length === 0) {
      return { skipped: true, reason: 'no_presets' } satisfies KangurSocialPipelineJobResult;
    }

    if (signal?.aborted) {
      return { skipped: true, reason: 'aborted' } satisfies KangurSocialPipelineJobResult;
    }

    const result = await createKangurSocialImageAddonsBatch({
      baseUrl,
      presetIds,
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
      addonsCreated: result.addons.length,
      failures: result.failures.length,
      runId: result.runId,
    } satisfies KangurSocialPipelineJobResult;
  },
  onCompleted: async (_jobId, result) => {
    const typed = result as KangurSocialPipelineJobResult | null;
    if (typed?.skipped) {
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

export const enqueueKangurSocialPipelineJob = async (): Promise<string> =>
  queue.enqueue({ type: 'pipeline-tick' });

export const getKangurSocialPipelineQueue = (): ManagedQueue<KangurSocialPipelineJobData> => queue;

export const startKangurSocialPipelineQueue = (): void => {
  if (!queueState.workerStarted) {
    queueState.workerStarted = true;
    queue.startWorker();
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
