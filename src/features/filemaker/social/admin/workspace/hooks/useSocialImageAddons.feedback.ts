import {
  logSocialPublishingClientError,
  trackSocialPublishingClientEvent,
} from '@/features/filemaker/social/client-observability';
import { buildSocialPublishingCaptureFailureSummary } from '@/features/filemaker/social/shared/social-capture-feedback';
import type { SocialPublishingImageAddonsBatchResult } from '@/shared/contracts/social-publishing-image-addons';
import { extractMutationErrorMessage } from '@/shared/lib/mutation-error-handler';
import { ErrorSystem } from '@/shared/utils/observability/error-system-client';

import type { SocialImageAddonsDeps, ToastFn } from './useSocialImageAddons.types';

type BatchCaptureSummary = {
  failureCount: number;
  message: string;
  successCount: number;
  variant: 'success' | 'warning';
};

const resolveBatchCaptureVariant = ({
  failureCount,
  successCount,
}: Pick<BatchCaptureSummary, 'failureCount' | 'successCount'>): 'success' | 'warning' => {
  if (failureCount > 0) {
    return 'warning';
  }
  return successCount > 0 ? 'success' : 'warning';
};

const resolveBatchCaptureSummaryMessage = ({
  failureCount,
  failureSummary,
  successCount,
}: {
  failureCount: number;
  failureSummary: string;
  successCount: number;
}): string => {
  const statusText =
    successCount > 0 ? 'Batch capture completed' : 'Batch capture finished with no assets';
  const failureDetails =
    failureSummary.length > 0 ? ` Failures: ${failureSummary}.` : '';
  return (
    `${statusText} (${successCount} add-on${successCount === 1 ? '' : 's'}, ` +
    `${failureCount} failure${failureCount === 1 ? '' : 's'})${failureDetails}`
  );
};

const normalizeFailureSummary = (
  result: SocialPublishingImageAddonsBatchResult
): string => {
  const summary: unknown = buildSocialPublishingCaptureFailureSummary(result.failures);
  return typeof summary === 'string' ? summary.trim() : '';
};

export const resolveBatchCaptureSummary = (
  result: SocialPublishingImageAddonsBatchResult
): BatchCaptureSummary => {
  const successCount = result.addons.length;
  const failureCount = result.failures.length;
  const failureSummary = normalizeFailureSummary(result);

  return {
    successCount,
    failureCount,
    message: resolveBatchCaptureSummaryMessage({
      failureCount,
      failureSummary,
      successCount,
    }),
    variant: resolveBatchCaptureVariant({ failureCount, successCount }),
  };
};

export const handleBatchCaptureSuccess = ({
  deps,
  presetIds,
  result,
  setBatchCaptureResult,
  toast,
}: {
  deps: Pick<SocialImageAddonsDeps, 'buildSocialContext'>;
  presetIds: string[];
  result: SocialPublishingImageAddonsBatchResult;
  setBatchCaptureResult: (value: SocialPublishingImageAddonsBatchResult | null) => void;
  toast: ToastFn;
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

export const handleBatchCaptureFailure = ({
  deps,
  error,
  toast,
}: {
  deps: Pick<SocialImageAddonsDeps, 'buildSocialContext'>;
  error: unknown;
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
