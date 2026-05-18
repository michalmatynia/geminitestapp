import { trackSocialPublishingClientEvent } from '@/features/filemaker/social/client-observability';
import { buildSocialPublishingCaptureFailureSummary } from '@/features/filemaker/social/shared/social-capture-feedback';
import { resolveFailedSocialPublishingPresetIds } from '@/features/filemaker/social/shared/social-capture-feedback';
import type {
  SocialPublishingCaptureAppearanceMode,
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchProgress,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';
import { extractMutationErrorMessage } from '@/shared/lib/mutation-error-handler';

import {
  handleBatchCaptureFailure,
  handleBatchCaptureSuccess,
} from './useSocialImageAddons.feedback';
import { waitForBatchCaptureJob } from './useSocialImageAddons.polling';
import {
  buildBatchCaptureMutationPayload,
  resolveBatchCaptureRequest,
} from './useSocialImageAddons.request';
import type {
  BatchCaptureOptions,
  BatchCaptureStateControls,
  SocialImageAddonsDeps,
  SocialImageAddonsMutations,
  ToastFn,
} from './useSocialImageAddons.types';

type BatchCaptureRuntimeParams = SocialImageAddonsMutations & {
  appearanceMode: SocialPublishingCaptureAppearanceMode;
  deps: SocialImageAddonsDeps;
  invalidateBatchCaptureRecentJobs: () => void;
  state: BatchCaptureStateControls;
  toast: ToastFn;
};

const trackBatchCaptureAttempt = ({
  async,
  deps,
  request,
}: {
  async: boolean;
  deps: SocialImageAddonsDeps;
  request: ReturnType<typeof resolveBatchCaptureRequest>;
}): void => {
  const routeCount = request.playwrightRoutes?.length ?? 0;
  trackSocialPublishingClientEvent(
    'social_publishing_batch_capture_attempt',
    deps.buildSocialContext({
      baseUrl: request.baseUrl,
      presetCount: request.presetIds.length,
      presetLimit: request.presetLimit,
      programmableRouteCount: routeCount,
      playwrightPersonaId: request.playwrightPersonaId,
      isProgrammableCapture: routeCount > 0,
      ...(async ? { async: true } : {}),
    })
  );
};

const resolveCompletedBatchCaptureResult = (
  job: SocialPublishingImageAddonsBatchJob
): SocialPublishingImageAddonsBatchResult => {
  if (job.status !== 'completed' || job.result === null) {
    throw new Error(job.error ?? 'Batch capture failed');
  }
  return job.result;
};

const resolveCapturedAddonsMessage = (
  result: SocialPublishingImageAddonsBatchResult
): string => {
  const failureSummary = normalizeFailureSummary(result);
  const failureSuffix =
    failureSummary.length > 0 ? ` Failed: ${failureSummary}.` : '';
  return (
    `Captured ${result.addons.length} add-on${result.addons.length === 1 ? '' : 's'} ` +
    `from the current batch.${failureSuffix}`
  );
};

const normalizeFailureSummary = (
  result: SocialPublishingImageAddonsBatchResult
): string => {
  const summary: unknown = buildSocialPublishingCaptureFailureSummary(result.failures);
  return typeof summary === 'string' ? summary.trim() : '';
};

const applyCompletedBatchCaptureMessage = ({
  result,
  state,
}: {
  result: SocialPublishingImageAddonsBatchResult;
  state: BatchCaptureStateControls;
}): void => {
  const failureSummary = normalizeFailureSummary(result);
  if (result.addons.length === 0 && result.failures.length > 0) {
    state.setBatchCaptureMessage(null);
    state.setBatchCaptureErrorMessage(
      failureSummary.length > 0
        ? `Batch capture finished with no assets. Failures: ${failureSummary}.`
        : 'Batch capture finished with no assets.'
    );
    return;
  }
  state.setBatchCaptureMessage(resolveCapturedAddonsMessage(result));
};

const resolveProgressField = (
  progress: SocialPublishingImageAddonsBatchProgress | null,
  field: 'completedCount' | 'remainingCount' | 'totalCount'
): number => {
  if (progress === null) {
    return 0;
  }
  return progress[field];
};

const resolveProgressStatusMessage = (
  progress: SocialPublishingImageAddonsBatchProgress | null
): string | null => {
  if (progress === null) {
    return null;
  }
  return progress.message ?? null;
};

const resolveProgressMessage = (job: SocialPublishingImageAddonsBatchJob): string => {
  const progress = job.progress;
  const statusMessage = resolveProgressStatusMessage(progress);
  if (statusMessage !== null) {
    return statusMessage;
  }
  const completedCount = resolveProgressField(progress, 'completedCount');
  const remainingCount = resolveProgressField(progress, 'remainingCount');
  const totalCount = resolveProgressField(progress, 'totalCount');
  return (
    `Playwright capture in progress: ${completedCount} captured, ` +
    `${remainingCount} left of ${totalCount} targets.`
  );
};

const updateBatchCaptureProgress = ({
  job,
  state,
}: {
  job: SocialPublishingImageAddonsBatchJob;
  state: BatchCaptureStateControls;
}): void => {
  state.setBatchCaptureJob(job);
  if (job.status === 'queued' || job.status === 'running') {
    state.setBatchCaptureMessage(resolveProgressMessage(job));
  }
};

export const runBatchCaptureNow = async ({
  appearanceMode,
  batchCaptureMutation,
  deps,
  state,
  toast,
  ...params
}: BatchCaptureRuntimeParams & {
  options?: BatchCaptureOptions;
}): Promise<SocialPublishingImageAddonsBatchResult> => {
  const request = resolveBatchCaptureRequest({ deps, options: params.options, toast });
  trackBatchCaptureAttempt({ async: false, deps, request });
  try {
    const result = await batchCaptureMutation.mutateAsync(
      buildBatchCaptureMutationPayload({ appearanceMode, request })
    );
    handleBatchCaptureSuccess({
      result,
      toast,
      setBatchCaptureResult: state.setBatchCaptureResult,
      deps,
      presetIds: request.presetIds,
    });
    return result;
  } catch (error) {
    handleBatchCaptureFailure({ error, deps, toast });
    throw error;
  }
};

export const startBatchCaptureJob = async ({
  appearanceMode,
  deps,
  startBatchCaptureMutation,
  toast,
  ...params
}: BatchCaptureRuntimeParams & {
  options?: BatchCaptureOptions;
}): Promise<SocialPublishingImageAddonsBatchJob> => {
  const request = resolveBatchCaptureRequest({ deps, options: params.options, toast });
  trackBatchCaptureAttempt({ async: true, deps, request });
  try {
    const startedJob = await startBatchCaptureMutation.mutateAsync(
      buildBatchCaptureMutationPayload({ appearanceMode, request })
    );
    params.invalidateBatchCaptureRecentJobs();
    return startedJob;
  } catch (error) {
    handleBatchCaptureFailure({ error, deps, toast });
    throw error;
  }
};

export const runTrackedBatchCaptureJob = async (
  params: BatchCaptureRuntimeParams & {
    options?: BatchCaptureOptions;
  }
): Promise<void> => {
  const { deps, state, toast } = params;
  state.setBatchCapturePending(true);
  state.setBatchCaptureJob(null);
  state.setBatchCaptureMessage('Capturing screenshots...');
  state.setBatchCaptureErrorMessage(null);

  try {
    const startedJob = await startBatchCaptureJob(params);
    state.setBatchCaptureJob(startedJob);
    state.setBatchCaptureMessage(startedJob.progress?.message ?? 'Queued Playwright capture...');
    const completedJob = await waitForBatchCaptureJob(startedJob, (job) =>
      updateBatchCaptureProgress({ job, state })
    );
    const result = resolveCompletedBatchCaptureResult(completedJob);
    handleBatchCaptureSuccess({
      result,
      toast,
      setBatchCaptureResult: state.setBatchCaptureResult,
      deps,
      presetIds: result.usedPresetIds ?? deps.batchCapturePresetIds,
    });
    applyCompletedBatchCaptureMessage({ result, state });
  } catch (error) {
    state.setBatchCaptureMessage(null);
    state.setBatchCaptureErrorMessage(extractMutationErrorMessage(error, 'Batch capture failed'));
    handleBatchCaptureFailure({ error, deps, toast });
  } finally {
    params.invalidateBatchCaptureRecentJobs();
    state.setBatchCapturePending(false);
  }
};

export const retryFailedPresetBatchCaptureJob = async ({
  deps,
  handleBatchCapture,
  job,
  toast,
}: {
  deps: SocialImageAddonsDeps;
  handleBatchCapture: (options?: BatchCaptureOptions) => Promise<void>;
  job: SocialPublishingImageAddonsBatchJob;
  toast: ToastFn;
}): Promise<void> => {
  const failedPresetIds = resolveFailedSocialPublishingPresetIds(job.result?.failures ?? []);
  if (failedPresetIds.length === 0) {
    toast('This run has no failed presets to retry.', { variant: 'warning' });
    return;
  }

  await handleBatchCapture({
    baseUrl: job.request?.baseUrl ?? deps.batchCaptureBaseUrl,
    presetIds: failedPresetIds,
    presetLimit: null,
  });
};
