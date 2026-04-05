import type {
  KangurSocialImageAddonsBatchJob,
  KangurSocialImageAddonsBatchResult,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';
import { buildKangurSocialCaptureFailureSummary } from '@/features/kangur/social/shared/social-capture-feedback';

export const BATCH_CAPTURE_POLL_INTERVAL_MS = 1000;

export const isBatchCaptureJobTerminal = (
  status: KangurSocialImageAddonsBatchJob['status'] | null | undefined
): boolean => status === 'completed' || status === 'failed';

export const waitForDelay = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const appendCaptureFailureSummary = (
  message: string,
  failures: KangurSocialImageAddonsBatchResult['failures'],
  routes?: KangurSocialProgrammableCaptureRoute[]
): string => {
  const failureSummary = buildKangurSocialCaptureFailureSummary(failures, { routes });
  return failureSummary ? `${message} Failed: ${failureSummary}.` : message;
};

export const buildCaptureFailureMessage = (
  prefix: string,
  failures: KangurSocialImageAddonsBatchResult['failures'],
  routes?: KangurSocialProgrammableCaptureRoute[]
): string => {
  const failureSummary = buildKangurSocialCaptureFailureSummary(failures, { routes });
  return failureSummary ? `${prefix} Failures: ${failureSummary}.` : prefix;
};

export const buildLiveBatchCaptureMessage = (
  job: KangurSocialImageAddonsBatchJob | null
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
