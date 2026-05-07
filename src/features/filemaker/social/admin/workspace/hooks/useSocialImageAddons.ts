'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { safeSetTimeout } from '@/shared/lib/timers';

import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import { useToast } from '@/shared/ui';
import type {
  SocialPublishingCaptureAppearanceMode,
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import {
  fetchSocialPublishingImageAddonsBatchJob,
  useBatchCaptureSocialPublishingImageAddons,
  useCreateSocialPublishingImageAddon,
  useStartBatchCaptureSocialPublishingImageAddons,
} from '@/features/filemaker/social/hooks/useSocialPublishingImageAddons';
import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';
import { extractMutationErrorMessage } from '@/shared/lib/mutation-error-handler';
import { buildSocialPublishingCaptureFailureSummary } from '@/features/filemaker/social/shared/social-capture-feedback';
import { resolveFailedSocialPublishingPresetIds } from '@/features/filemaker/social/shared/social-capture-feedback';
import { validateSocialPublishingProgrammableCaptureRoutes } from '@/features/filemaker/social/shared/social-playwright-capture';
import {
  KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY,
  KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY,
} from '@/features/kangur/appearance/storefront-appearance-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { emptyAddonForm, type AddonFormState } from '../SocialPublishingPage.Constants';

const BATCH_CAPTURE_POLL_INTERVAL_MS = 1000;

type ToastFn = ReturnType<typeof useToast>['toast'];

type SocialImageAddonsDeps = {
  addonForm: AddonFormState;
  setAddonForm: (value: AddonFormState) => void;
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

const normalizeAppearanceMode = (
  value: string | null | undefined
): SocialPublishingCaptureAppearanceMode | null =>
  value === 'default' || value === 'dawn' || value === 'sunset' || value === 'dark' ? value : null;

const readPersistedAppearanceMode = (): SocialPublishingCaptureAppearanceMode | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizeAppearanceMode(
      window.localStorage.getItem(KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY)
    );
  } catch {
    return null;
  }
};

const throwBatchCaptureValidationError = (
  toast: ToastFn,
  message: string,
  variant: 'error' | 'warning'
): never => {
  toast(message, { variant });
  throw new Error(message);
};

const validateBatchCaptureRequest = ({
  toast,
  baseUrl,
  presetIds,
  playwrightRoutes,
}: {
  toast: ToastFn;
  baseUrl: string;
  presetIds: string[];
  playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
}): void => {
  if (presetIds.length > 0 && !baseUrl) {
    throwBatchCaptureValidationError(toast, 'Base URL is required for batch capture', 'error');
  }
  if (presetIds.length === 0 && (playwrightRoutes?.length ?? 0) === 0) {
    throwBatchCaptureValidationError(
      toast,
      'Select at least one capture preset or programmable route',
      'warning'
    );
  }
  if ((playwrightRoutes?.length ?? 0) > 0) {
    const validation = validateSocialPublishingProgrammableCaptureRoutes(
      playwrightRoutes ?? [],
      baseUrl
    );
    if (!validation.isValid && validation.firstIssue) {
      throwBatchCaptureValidationError(toast, validation.firstIssue, 'warning');
    }
  }
};

const resolveBatchCaptureSummary = (
  result: SocialPublishingImageAddonsBatchResult
): {
  successCount: number;
  failureCount: number;
  message: string;
  variant: 'success' | 'warning';
} => {
  const successCount = result.addons.length;
  const failureCount = result.failures.length;
  const failureSummary = buildSocialPublishingCaptureFailureSummary(result.failures);

  return {
    successCount,
    failureCount,
    message:
      `${successCount > 0 ? 'Batch capture completed' : 'Batch capture finished with no assets'} ` +
      `(${successCount} add-on${successCount === 1 ? '' : 's'}, ` +
      `${failureCount} failure${failureCount === 1 ? '' : 's'})${ 
      failureSummary ? ` Failures: ${failureSummary}.` : ''}`,
    variant: failureCount > 0 ? 'warning' : successCount > 0 ? 'success' : 'warning',
  };
};

const resolveBatchCaptureRequest = ({
  deps,
  options,
  toast,
}: {
  deps: Pick<
    SocialImageAddonsDeps,
    'batchCaptureBaseUrl' | 'batchCapturePresetIds' | 'batchCapturePresetLimit'
  >;
  options:
    | {
        baseUrl?: string;
        presetIds?: string[];
        presetLimit?: number | null;
        playwrightPersonaId?: string | null;
        playwrightScript?: string;
        playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
      }
    | undefined;
  toast: ToastFn;
}) => {
  const baseUrl = (options?.baseUrl ?? deps.batchCaptureBaseUrl).trim();
  const presetIds = options?.presetIds ?? deps.batchCapturePresetIds;
  const presetLimit =
    options && Object.prototype.hasOwnProperty.call(options, 'presetLimit')
      ? options.presetLimit ?? null
      : deps.batchCapturePresetLimit;
  const playwrightRoutes = options?.playwrightRoutes;
  validateBatchCaptureRequest({ toast, baseUrl, presetIds, playwrightRoutes });
  const request: {
    baseUrl: string;
    presetIds: string[];
    presetLimit: number | null;
    playwrightPersonaId?: string | null;
    playwrightScript?: string;
    playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
  } = {
    baseUrl,
    presetIds,
    presetLimit,
  };
  if (options && Object.prototype.hasOwnProperty.call(options, 'playwrightPersonaId')) {
    request.playwrightPersonaId = options.playwrightPersonaId ?? null;
  }
  if (options && Object.prototype.hasOwnProperty.call(options, 'playwrightScript')) {
    request.playwrightScript = options.playwrightScript;
  }
  if (options && Object.prototype.hasOwnProperty.call(options, 'playwrightRoutes')) {
    request.playwrightRoutes = playwrightRoutes;
  }
  return request;
};

const buildBatchCaptureMutationPayload = ({
  request,
  appearanceMode,
}: {
  request: ReturnType<typeof resolveBatchCaptureRequest>;
  appearanceMode: SocialPublishingCaptureAppearanceMode;
}) => ({
  ...(request.baseUrl ? { baseUrl: request.baseUrl } : {}),
  presetIds: request.presetIds,
  presetLimit: request.presetLimit,
  appearanceMode,
  ...(Object.prototype.hasOwnProperty.call(request, 'playwrightPersonaId')
    ? { playwrightPersonaId: request.playwrightPersonaId }
    : {}),
  ...(Object.prototype.hasOwnProperty.call(request, 'playwrightScript')
    ? { playwrightScript: request.playwrightScript }
    : {}),
  ...(Object.prototype.hasOwnProperty.call(request, 'playwrightRoutes')
    ? { playwrightRoutes: request.playwrightRoutes }
    : {}),
});

const handleBatchCaptureSuccess = ({
  result,
  toast,
  setBatchCaptureResult,
  deps,
  presetIds,
}: {
  result: SocialPublishingImageAddonsBatchResult;
  toast: ToastFn;
  setBatchCaptureResult: (value: SocialPublishingImageAddonsBatchResult | null) => void;
  deps: Pick<SocialImageAddonsDeps, 'buildSocialContext'>;
  presetIds: string[];
}): void => {
  setBatchCaptureResult(result);
  const { successCount, failureCount, message, variant } = resolveBatchCaptureSummary(result);
  toast(message, { variant });
  trackSocialPublishingClientEvent(
    'social_publishing_batch_capture_success',
    deps.buildSocialContext({
      successCount,
      failureCount,
      usedPresetCount: result.usedPresetCount ?? presetIds.length,
    })
  );
};

const handleBatchCaptureFailure = ({
  error,
  deps,
  toast,
}: {
  error: unknown;
  deps: Pick<SocialImageAddonsDeps, 'buildSocialContext'>;
  toast: ToastFn;
}): void => {
  const message = extractMutationErrorMessage(error, 'Batch capture failed');
  void ErrorSystem.captureException(error);
  logSocialPublishingClientError(error, {
    source: 'AdminSocialPublishingPage',
    action: 'batchCapture',
    ...deps.buildSocialContext({ error: true }),
  });
  toast(message, { variant: 'error' });
  trackSocialPublishingClientEvent(
    'social_publishing_batch_capture_failed',
    deps.buildSocialContext({ error: true, errorMessage: message })
  );
};

export function useSocialImageAddons(deps: SocialImageAddonsDeps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const storefrontAppearance = useOptionalCmsStorefrontAppearance();
  const createAddonMutation = useCreateSocialPublishingImageAddon();
  const batchCaptureMutation = useBatchCaptureSocialPublishingImageAddons();
  const startBatchCaptureMutation = useStartBatchCaptureSocialPublishingImageAddons();
  const [batchCaptureResult, setBatchCaptureResult] =
    useState<SocialPublishingImageAddonsBatchResult | null>(null);
  const [batchCapturePending, setBatchCapturePending] = useState(false);
  const [batchCaptureJob, setBatchCaptureJob] = useState<SocialPublishingImageAddonsBatchJob | null>(
    null
  );
  const [batchCaptureMessage, setBatchCaptureMessage] = useState<string | null>(null);
  const [batchCaptureErrorMessage, setBatchCaptureErrorMessage] = useState<string | null>(null);
  const storedDefaultAppearanceMode = settingsStore.get(
    KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY
  );

  const resolveCaptureAppearanceMode = (): SocialPublishingCaptureAppearanceMode =>
    normalizeAppearanceMode(storefrontAppearance?.mode) ??
    readPersistedAppearanceMode() ??
    normalizeAppearanceMode(storedDefaultAppearanceMode) ??
    'default';
  const captureAppearanceMode = resolveCaptureAppearanceMode();

  const invalidateBatchCaptureRecentJobs = (): void => {
    void queryClient.invalidateQueries({
      queryKey: ['social-publishing', 'image-addon-batch-jobs'],
    });
  };

  const waitForBatchCaptureJob = async (
    initialJob: SocialPublishingImageAddonsBatchJob,
    onUpdate?: (job: SocialPublishingImageAddonsBatchJob) => void
  ): Promise<SocialPublishingImageAddonsBatchJob> => {
    let currentJob = initialJob;
    onUpdate?.(currentJob);

    for (let attempt = 0; attempt < 240; attempt += 1) {
      const latestJob = await fetchSocialPublishingImageAddonsBatchJob(initialJob.id);
      if (latestJob) {
        currentJob = latestJob;
        onUpdate?.(currentJob);
      }

      if (currentJob.status === 'completed' || currentJob.status === 'failed') {
        return currentJob;
      }

      await new Promise((resolve) => safeSetTimeout(resolve, BATCH_CAPTURE_POLL_INTERVAL_MS));
    }

    throw new Error('Timed out waiting for Playwright capture job.');
  };

  const handleCreateAddon = async (): Promise<void> => {
    const title = deps.addonForm.title.trim();
    const sourceUrl = deps.addonForm.sourceUrl.trim();
    if (!title || !sourceUrl) return;
    const waitForMsRaw = Number(deps.addonForm.waitForMs);
    const waitForMs = Number.isFinite(waitForMsRaw) ? Math.max(0, waitForMsRaw) : undefined;
    trackSocialPublishingClientEvent(
      'social_publishing_addon_capture_attempt',
      deps.buildSocialContext({ addonTitleLength: title.length })
    );
    try {
      const created = await createAddonMutation.mutateAsync({
        title,
        sourceUrl,
        description: deps.addonForm.description.trim() || undefined,
        selector: deps.addonForm.selector.trim() || undefined,
        appearanceMode: captureAppearanceMode,
        ...(waitForMs !== undefined ? { waitForMs } : {}),
      });
      deps.setAddonForm(emptyAddonForm);
      trackSocialPublishingClientEvent(
        'social_publishing_addon_capture_success',
        deps.buildSocialContext({ addonId: created.id })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logSocialPublishingClientError(error, {
        source: 'AdminSocialPublishingPage',
        action: 'createAddon',
        ...deps.buildSocialContext({ error: true }),
      });
      trackSocialPublishingClientEvent(
        'social_publishing_addon_capture_failed',
        deps.buildSocialContext({ error: true })
      );
    }
  };

  const runBatchCapture = async (options?: {
    baseUrl?: string;
    presetIds?: string[];
    presetLimit?: number | null;
    playwrightPersonaId?: string | null;
    playwrightScript?: string;
    playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
  }): Promise<SocialPublishingImageAddonsBatchResult> => {
    const request = resolveBatchCaptureRequest({ deps, options, toast });
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
      })
    );
    try {
      const result = await batchCaptureMutation.mutateAsync(
        buildBatchCaptureMutationPayload({
          request,
          appearanceMode: captureAppearanceMode,
        })
      );
      handleBatchCaptureSuccess({
        result,
        toast,
        setBatchCaptureResult,
        deps,
        presetIds: request.presetIds,
      });
      return result;
    } catch (error) {
      handleBatchCaptureFailure({ error, deps, toast });
      throw error;
    }
  };

  const handleBatchCapture = async (options?: {
    baseUrl?: string;
    presetIds?: string[];
    presetLimit?: number | null;
    playwrightPersonaId?: string | null;
    playwrightScript?: string;
    playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
  }): Promise<void> => {
    setBatchCapturePending(true);
    setBatchCaptureJob(null);
    setBatchCaptureMessage('Capturing screenshots...');
    setBatchCaptureErrorMessage(null);

    try {
      const startedJob = await startBatchCapture(options);
      setBatchCaptureJob(startedJob);
      setBatchCaptureMessage(startedJob.progress?.message ?? 'Queued Playwright capture...');

      const completedJob = await waitForBatchCaptureJob(startedJob, (job) => {
        setBatchCaptureJob(job);
        if (job.status === 'queued' || job.status === 'running') {
          setBatchCaptureMessage(
            job.progress?.message ??
              `Playwright capture in progress: ${job.progress?.completedCount ?? 0} captured, ${job.progress?.remainingCount ?? 0} left of ${job.progress?.totalCount ?? 0} targets.`
          );
        }
      });

      if (completedJob.status !== 'completed' || !completedJob.result) {
        throw new Error(completedJob.error || 'Batch capture failed');
      }

      handleBatchCaptureSuccess({
        result: completedJob.result,
        toast,
        setBatchCaptureResult,
        deps,
        presetIds: completedJob.result.usedPresetIds ?? deps.batchCapturePresetIds,
      });
      const failureSummary = buildSocialPublishingCaptureFailureSummary(completedJob.result.failures);
      if (completedJob.result.addons.length === 0 && completedJob.result.failures.length > 0) {
        setBatchCaptureMessage(null);
        setBatchCaptureErrorMessage(
          failureSummary
            ? `Batch capture finished with no assets. Failures: ${failureSummary}.`
            : 'Batch capture finished with no assets.'
        );
        return;
      }
      setBatchCaptureMessage(
        `Captured ${completedJob.result.addons.length} add-on${completedJob.result.addons.length === 1 ? '' : 's'} from the current batch.${ 
          failureSummary ? ` Failed: ${failureSummary}.` : ''}`
      );
    } catch (error) {
      setBatchCaptureMessage(null);
      setBatchCaptureErrorMessage(extractMutationErrorMessage(error, 'Batch capture failed'));
      handleBatchCaptureFailure({ error, deps, toast });
    } finally {
      invalidateBatchCaptureRecentJobs();
      setBatchCapturePending(false);
    }
  };

  const startBatchCapture = async (options?: {
    baseUrl?: string;
    presetIds?: string[];
    presetLimit?: number | null;
    playwrightPersonaId?: string | null;
    playwrightScript?: string;
    playwrightRoutes?: SocialPublishingProgrammableCaptureRoute[];
  }): Promise<SocialPublishingImageAddonsBatchJob> => {
    const request = resolveBatchCaptureRequest({ deps, options, toast });
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
        async: true,
      })
    );

    try {
      const startedJob = await startBatchCaptureMutation.mutateAsync(
        buildBatchCaptureMutationPayload({
          request,
          appearanceMode: captureAppearanceMode,
        })
      );
      invalidateBatchCaptureRecentJobs();
      return startedJob;
    } catch (error) {
      handleBatchCaptureFailure({ error, deps, toast });
      throw error;
    }
  };

  const handleRetryFailedPresetBatchCaptureJob = async (
    job: SocialPublishingImageAddonsBatchJob
  ): Promise<void> => {
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

  return {
    createAddonMutation,
    batchCaptureMutation,
    startBatchCaptureMutation,
    batchCaptureResult,
    batchCapturePending,
    batchCaptureJob,
    batchCaptureMessage,
    batchCaptureErrorMessage,
    captureAppearanceMode,
    setBatchCaptureResult,
    runBatchCapture,
    startBatchCapture,
    readBatchCaptureJob: fetchSocialPublishingImageAddonsBatchJob,
    handleCreateAddon,
    handleBatchCapture,
    handleRetryFailedPresetBatchCaptureJob,
  };
}
