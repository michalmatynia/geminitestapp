import 'server-only';

import type { Queue } from 'bullmq';

import { createSocialPublishingImageAddonsBatch } from '@/features/filemaker/social/server/social-image-addons-batch';
import {
  runSocialPublishingPostPipeline,
  type RunSocialPublishingPostPipelineInput,
  type SocialPublishingManualPipelineJobResult,
} from '@/features/filemaker/social/server/social-posts-pipeline';
import {
  runSocialPublishingPostGenerationJob,
  runSocialPublishingPostVisualAnalysisJob,
} from '@/features/filemaker/social/server/social-posts-runtime';
import { updateSocialPublishingPost } from '@/features/filemaker/social/server/social-posts-repository';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import {
  SOCIAL_PUBLISHING_SETTINGS_KEY,
  parseSocialPublishingSettings,
} from '@/features/filemaker/social/settings';
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

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Image analysis failed.';

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
  processor: async (data, _jobId, signal, helpers) => {
    const startedAt = Date.now();

    if (data.type === 'manual-post-pipeline') {
      const result = await runSocialPublishingPostPipeline(data.input, {
        reportProgress: async (progress) => {
          await helpers?.updateProgress(progress);
        },
      });
      void ErrorSystem.logInfo('Social publishing manual pipeline completed', {
        service: 'social-publishing-pipeline-queue',
        postId: result.postId,
        addonsCreated: result.addonsCreated,
        failures: result.failures,
        runId: result.runId,
        durationMs: Date.now() - startedAt,
      });
      return result satisfies SocialPublishingPipelineJobResult;
    }

    if (data.type === 'manual-post-visual-analysis') {
      const normalizedPostId = data.input.postId?.trim() || null;
      if (normalizedPostId) {
        await updateSocialPublishingPost(normalizedPostId, {
          visualAnalysisStatus: 'running',
          visualAnalysisJobId: _jobId || null,
          visualAnalysisModelId: data.input.visionModelId?.trim() || null,
          visualAnalysisError: null,
          updatedBy: data.input.actorId,
        }).catch(() => null);
      }
      await helpers?.updateProgress({
        type: 'manual-post-visual-analysis',
        step: 'loading_assets',
        message: 'Loading selected visuals for analysis...',
        updatedAt: Date.now(),
        postId: normalizedPostId,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        highlightCount: null,
      });
      await helpers?.updateProgress({
        type: 'manual-post-visual-analysis',
        step: 'analyzing',
        message: 'Running Redis-backed image analysis...',
        updatedAt: Date.now(),
        postId: normalizedPostId,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        highlightCount: null,
      });
      try {
        const result = await runSocialPublishingPostVisualAnalysisJob({
          ...data.input,
          jobId: _jobId,
        });
        await helpers?.updateProgress({
          type: 'manual-post-visual-analysis',
          step: 'saving',
          message: 'Image analysis saved on the post.',
          updatedAt: Date.now(),
          postId: result.postId,
          imageAddonCount: result.imageAddonIds.length,
          highlightCount: result.analysis.highlights.length,
        });
        void ErrorSystem.logInfo('Social publishing visual analysis job completed', {
          service: 'social-publishing-pipeline-queue',
          postId: result.postId,
          imageAddonCount: result.imageAddonIds.length,
          highlightCount: result.analysis.highlights.length,
          durationMs: Date.now() - startedAt,
        });
        return result satisfies SocialPublishingPipelineJobResult;
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        if (normalizedPostId) {
          await updateSocialPublishingPost(normalizedPostId, {
            visualAnalysisStatus: 'failed',
            visualAnalysisJobId: _jobId || null,
            visualAnalysisModelId: data.input.visionModelId?.trim() || null,
            visualAnalysisError: errorMessage,
            updatedBy: data.input.actorId,
          }).catch(() => null);
        }
        throw error;
      }
    }

    if (data.type === 'manual-post-generation') {
      await helpers?.updateProgress({
        type: 'manual-post-generation',
        step: 'loading_assets',
        message: 'Loading selected visuals and context...',
        updatedAt: Date.now(),
        postId: data.input.postId?.trim() || null,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        docReferenceCount: data.input.docReferences?.length ?? 0,
        visualSummaryPresent: Boolean(data.input.prefetchedVisualAnalysis?.summary?.trim()),
        highlightCount: data.input.prefetchedVisualAnalysis?.highlights?.length ?? null,
      });
      await helpers?.updateProgress({
        type: 'manual-post-generation',
        step: 'generating',
        message: 'Running Redis-backed post generation...',
        updatedAt: Date.now(),
        postId: data.input.postId?.trim() || null,
        imageAddonCount: data.input.imageAddonIds?.length ?? 0,
        docReferenceCount: data.input.docReferences?.length ?? 0,
        visualSummaryPresent: Boolean(data.input.prefetchedVisualAnalysis?.summary?.trim()),
        highlightCount: data.input.prefetchedVisualAnalysis?.highlights?.length ?? null,
      });
      const result = await runSocialPublishingPostGenerationJob(data.input);
      await helpers?.updateProgress({
        type: 'manual-post-generation',
        step: result.generatedPost ? 'previewing' : 'saving',
        message: result.generatedPost
          ? 'Draft generated and saved on the post.'
          : 'Draft generated.',
        updatedAt: Date.now(),
        postId: result.postId,
        imageAddonCount: result.imageAddonIds.length,
        docReferenceCount: result.docReferences.length,
        visualSummaryPresent: Boolean(
          (result.generatedPost?.visualSummary ?? result.draft?.visualSummary ?? '').trim()
        ),
        highlightCount:
          result.generatedPost?.visualHighlights?.length ??
          result.draft?.visualHighlights?.length ??
          null,
      });
      void ErrorSystem.logInfo('Social publishing generation job completed', {
        service: 'social-publishing-pipeline-queue',
        postId: result.postId,
        imageAddonCount: result.imageAddonIds.length,
        durationMs: Date.now() - startedAt,
      });
      return result satisfies SocialPublishingPipelineJobResult;
    }

    const raw = await readStoredSettingValue(SOCIAL_PUBLISHING_SETTINGS_KEY);
    const settings = parseSocialPublishingSettings(raw);
    const baseUrl = settings.batchCaptureBaseUrl?.trim();
    if (!baseUrl) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'no_base_url',
      } satisfies SocialPublishingPipelineJobResult;
    }

    const presetIds = settings.batchCapturePresetIds;
    if (presetIds.length === 0) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'no_presets',
      } satisfies SocialPublishingPipelineJobResult;
    }

    if (signal?.aborted) {
      return {
        type: 'pipeline-tick',
        skipped: true,
        reason: 'aborted',
      } satisfies SocialPublishingPipelineJobResult;
    }

    const result = await createSocialPublishingImageAddonsBatch({
      baseUrl,
      presetIds,
      presetLimit: settings.batchCapturePresetLimit ?? null,
      createdBy: 'social-publishing-pipeline-queue',
    });

    void ErrorSystem.logInfo('Social publishing pipeline tick completed', {
      service: 'social-publishing-pipeline-queue',
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
    } satisfies SocialPublishingPipelineJobResult;
  },
  onCompleted: async (_jobId, result) => {
    const typed = result as SocialPublishingPipelineJobResult | null;
    if (isPipelineTickResult(typed) && typed.skipped) {
      void ErrorSystem.logInfo('Social publishing pipeline tick skipped', {
        service: 'social-publishing-pipeline-queue',
        reason: typed.reason,
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
