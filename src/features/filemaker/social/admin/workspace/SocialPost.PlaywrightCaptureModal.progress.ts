import type {
  SocialPublishingImageAddonsBatchJob,
} from '@/shared/contracts/social-publishing-image-addons';

import type { SocialPostPlaywrightCaptureContext } from './SocialPost.PlaywrightCaptureModal.runtime';

export type CaptureProgressState = {
  programmableCaptureCompletedCount: number; programmableCaptureFailureCount: number;
  programmableCaptureRemainingCount: number; programmableCaptureTotalCount: number;
  shouldShowProgrammableCaptureProgress: boolean;
};

const emptyProgressCounts = (): Omit<CaptureProgressState, 'shouldShowProgrammableCaptureProgress'> => ({
  programmableCaptureCompletedCount: 0,
  programmableCaptureFailureCount: 0,
  programmableCaptureRemainingCount: 0,
  programmableCaptureTotalCount: 0,
});

const captureProgressCounts = (
  job: SocialPublishingImageAddonsBatchJob | null
): Omit<CaptureProgressState, 'shouldShowProgrammableCaptureProgress'> => {
  if (job?.progress === null || job?.progress === undefined) return emptyProgressCounts();
  return {
    programmableCaptureCompletedCount: job.progress.completedCount,
    programmableCaptureFailureCount: job.progress.failureCount,
    programmableCaptureRemainingCount: job.progress.remainingCount,
    programmableCaptureTotalCount: job.progress.totalCount,
  };
};

const isCaptureJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

const shouldShowCaptureProgress = (
  job: SocialPublishingImageAddonsBatchJob | null,
  totalCount: number
): boolean => totalCount > 0 && isCaptureJobInFlight(job?.status ?? null);

export const resolveCaptureProgressState = (
  context: SocialPostPlaywrightCaptureContext
): CaptureProgressState => {
  const job = context.programmableCaptureBatchCaptureJob ?? null;
  const counts = captureProgressCounts(job);
  return {
    ...counts,
    shouldShowProgrammableCaptureProgress: shouldShowCaptureProgress(
      job,
      counts.programmableCaptureTotalCount
    ),
  };
};
