'use client';

import { useState } from 'react';

import { useToast } from '@/features/kangur/shared/ui';
import type { KangurSocialImageAddonsBatchResult } from '@/shared/contracts/kangur-social-image-addons';
import {
  useBatchCaptureKangurSocialImageAddons,
  useCreateKangurSocialImageAddon,
} from '@/features/kangur/ui/hooks/useKangurSocialImageAddons';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';

import { emptyAddonForm, type AddonFormState } from '../AdminKangurSocialPage.Constants';

type ToastFn = ReturnType<typeof useToast>['toast'];

type SocialImageAddonsDeps = {
  addonForm: AddonFormState;
  setAddonForm: (value: AddonFormState) => void;
  batchCaptureBaseUrl: string;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
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
}: {
  toast: ToastFn;
  baseUrl: string;
  presetIds: string[];
}): void => {
  if (!baseUrl) {
    throwBatchCaptureValidationError(toast, 'Base URL is required for batch capture', 'error');
  }
  if (presetIds.length === 0) {
    throwBatchCaptureValidationError(toast, 'Select at least one capture preset', 'warning');
  }
};

const resolveBatchCaptureSummary = (
  result: KangurSocialImageAddonsBatchResult
): {
  successCount: number;
  failureCount: number;
  message: string;
  variant: 'success' | 'warning';
} => {
  const successCount = result.addons.length;
  const failureCount = result.failures.length;
  const failureSummary = successCount === 0 && failureCount > 0
    ? `. ${result.failures.slice(0, 3).map((failure) => `${failure.id}: ${failure.reason}`).join('; ')}`
    : '';

  return {
    successCount,
    failureCount,
    message:
      `${successCount > 0 ? 'Batch capture completed' : 'Batch capture finished with no assets'} ` +
      `(${successCount} add-on${successCount === 1 ? '' : 's'}, ` +
      `${failureCount} failure${failureCount === 1 ? '' : 's'})${failureSummary}`,
    variant: successCount > 0 ? 'success' : 'warning',
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
      }
    | undefined;
  toast: ToastFn;
}) => {
  const baseUrl = (options?.baseUrl ?? deps.batchCaptureBaseUrl).trim();
  const presetIds = options?.presetIds ?? deps.batchCapturePresetIds;
  const presetLimit = options?.presetLimit ?? deps.batchCapturePresetLimit;
  validateBatchCaptureRequest({ toast, baseUrl, presetIds });
  return { baseUrl, presetIds, presetLimit };
};

const handleBatchCaptureSuccess = ({
  result,
  toast,
  setBatchCaptureResult,
  deps,
  presetIds,
}: {
  result: KangurSocialImageAddonsBatchResult;
  toast: ToastFn;
  setBatchCaptureResult: (value: KangurSocialImageAddonsBatchResult | null) => void;
  deps: Pick<SocialImageAddonsDeps, 'buildSocialContext'>;
  presetIds: string[];
}): void => {
  setBatchCaptureResult(result);
  const { successCount, failureCount, message, variant } = resolveBatchCaptureSummary(result);
  toast(message, { variant });
  trackKangurClientEvent(
    'kangur_social_batch_capture_success',
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
  void ErrorSystem.captureException(error);
  logKangurClientError(error, {
    source: 'AdminKangurSocialPage',
    action: 'batchCapture',
    ...deps.buildSocialContext({ error: true }),
  });
  toast('Batch capture failed', { variant: 'error' });
  trackKangurClientEvent(
    'kangur_social_batch_capture_failed',
    deps.buildSocialContext({ error: true })
  );
};

export function useSocialImageAddons(deps: SocialImageAddonsDeps) {
  const { toast } = useToast();
  const createAddonMutation = useCreateKangurSocialImageAddon();
  const batchCaptureMutation = useBatchCaptureKangurSocialImageAddons();
  const [batchCaptureResult, setBatchCaptureResult] =
    useState<KangurSocialImageAddonsBatchResult | null>(null);

  const handleCreateAddon = async (): Promise<void> => {
    const title = deps.addonForm.title.trim();
    const sourceUrl = deps.addonForm.sourceUrl.trim();
    if (!title || !sourceUrl) return;
    const waitForMsRaw = Number(deps.addonForm.waitForMs);
    const waitForMs = Number.isFinite(waitForMsRaw) ? Math.max(0, waitForMsRaw) : undefined;
    trackKangurClientEvent(
      'kangur_social_addon_capture_attempt',
      deps.buildSocialContext({ addonTitleLength: title.length })
    );
    try {
      const created = await createAddonMutation.mutateAsync({
        title,
        sourceUrl,
        description: deps.addonForm.description.trim() || undefined,
        selector: deps.addonForm.selector.trim() || undefined,
        ...(waitForMs !== undefined ? { waitForMs } : {}),
      });
      deps.setAddonForm(emptyAddonForm);
      trackKangurClientEvent(
        'kangur_social_addon_capture_success',
        deps.buildSocialContext({ addonId: created.id })
      );
    } catch (error) {
      void ErrorSystem.captureException(error);
      logKangurClientError(error, {
        source: 'AdminKangurSocialPage',
        action: 'createAddon',
        ...deps.buildSocialContext({ error: true }),
      });
      trackKangurClientEvent(
        'kangur_social_addon_capture_failed',
        deps.buildSocialContext({ error: true })
      );
    }
  };

  const runBatchCapture = async (options?: {
    baseUrl?: string;
    presetIds?: string[];
    presetLimit?: number | null;
  }): Promise<KangurSocialImageAddonsBatchResult> => {
    const request = resolveBatchCaptureRequest({ deps, options, toast });
    trackKangurClientEvent(
      'kangur_social_batch_capture_attempt',
      deps.buildSocialContext({
        baseUrl: request.baseUrl,
        presetCount: request.presetIds.length,
        presetLimit: request.presetLimit,
      })
    );
    try {
      const result = await batchCaptureMutation.mutateAsync(request);
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

  const handleBatchCapture = async (): Promise<void> => {
    try {
      await runBatchCapture();
    } catch {
      // Toasts and telemetry are handled inside runBatchCapture.
    }
  };

  return {
    createAddonMutation,
    batchCaptureMutation,
    batchCaptureResult,
    setBatchCaptureResult,
    runBatchCapture,
    handleCreateAddon,
    handleBatchCapture,
  };
}
