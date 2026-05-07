import { safeSetTimeout } from '@/shared/lib/timers';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import { buildSocialPublishingCaptureFailureSummary } from '@/features/filemaker/social/shared/social-capture-feedback';

export const BATCH_CAPTURE_POLL_INTERVAL_MS = 1000;

export const isBatchCaptureJobTerminal = (
  status: SocialPublishingImageAddonsBatchJob['status'] | null | undefined
): boolean => status === 'completed' || status === 'failed';

export const waitForDelay = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => safeSetTimeout(resolve, ms));
};

export const appendCaptureFailureSummary = (
  message: string,
  failures: SocialPublishingImageAddonsBatchResult['failures'],
  routes?: SocialPublishingProgrammableCaptureRoute[]
): string => {
  const failureSummary = buildSocialPublishingCaptureFailureSummary(failures, { routes });
  return failureSummary ? `${message} Failed: ${failureSummary}.` : message;
};

export const buildCaptureFailureMessage = (
  prefix: string,
  failures: SocialPublishingImageAddonsBatchResult['failures'],
  routes?: SocialPublishingProgrammableCaptureRoute[]
): string => {
  const failureSummary = buildSocialPublishingCaptureFailureSummary(failures, { routes });
  return failureSummary ? `${prefix} Failures: ${failureSummary}.` : prefix;
};

export const buildLiveBatchCaptureMessage = (
  job: SocialPublishingImageAddonsBatchJob | null
): string | null => {
  if (!job) return null;
  if (job.progress?.message?.trim()) {
    return job.progress.message;
  }
  if (!job.progress) {
    return job.status === 'queued'
      ? 'Queued Playwright capture...'
      : job.status === 'running'
        ? 'Running Playwright capture...'
        : null;
  }

  const failureSuffix =
    job.progress.failureCount > 0 ? ` ${job.progress.failureCount} failed.` : '';
  return `Playwright capture in progress: ${job.progress.completedCount} captured, ${job.progress.remainingCount} left of ${job.progress.totalCount} targets.${failureSuffix}`;
};
