import {
  buildSocialPublishingCaptureFailureSummary,
  buildSocialPublishingCapturePrimaryIssueSummary,
} from '@/features/filemaker/social/shared/social-capture-feedback';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingImageAddonsBatchResult,
} from '@/shared/contracts/social-publishing-image-addons';

type SocialRuntimeJobLike = {
  id?: string | null;
  status?: string | null;
  failedReason?: string | null;
  progress?: {
    message?: string | null;
  } | null;
} | null | undefined;

export type SocialCaptureActionState = {
  hasBlockingRuntimeJob: boolean;
  hasBlockingCaptureJob: boolean;
  hasCaptureActionLock: boolean;
  captureActionTitle: string | undefined;
};

export type LastBatchResultSummary = {
  completedCount: number;
  failedCount: number;
  skippedCount: number;
  totalCount: number;
  failureSummary: string | null;
  primaryIssueSummary: string | null;
};

const isNonEmptyString = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim().length > 0;

export const isSocialRuntimeJobInFlight = (
  status: string | null | undefined
): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (normalized === undefined || normalized.length === 0) {
    return false;
  }

  return normalized !== 'completed' && normalized !== 'failed';
};

export const isBatchCaptureJobInFlight = (
  status: SocialPublishingImageAddonsBatchJob['status'] | null | undefined
): boolean => status === 'queued' || status === 'running';

const readRuntimeJobQueueLabel = (job: SocialRuntimeJobLike): string | null => {
  const jobId = job?.id ?? null;
  return isNonEmptyString(jobId) ? `Queue job: ${jobId}` : null;
};

const readRuntimeJobProgressMessage = (job: SocialRuntimeJobLike): string | null =>
  job?.progress?.message ?? null;

export const buildSocialRuntimeJobTitle = (job: SocialRuntimeJobLike): string => {
  return [
    readRuntimeJobProgressMessage(job),
    job?.failedReason ?? null,
    readRuntimeJobQueueLabel(job),
  ]
    .filter(isNonEmptyString)
    .join(' · ');
};

export const hasSocialRuntimeJobStatus = (jobs: SocialRuntimeJobLike[]): boolean =>
  jobs.some((job) => isNonEmptyString(job?.status));

export const resolveCaptureActionState = ({
  batchCapturePending,
  batchCaptureJob,
  runtimeJobs,
}: {
  batchCapturePending: boolean;
  batchCaptureJob: SocialPublishingImageAddonsBatchJob | null;
  runtimeJobs: SocialRuntimeJobLike[];
}): SocialCaptureActionState => {
  const hasBlockingRuntimeJob = runtimeJobs.some((job) =>
    isSocialRuntimeJobInFlight(job?.status)
  );
  const hasBlockingCaptureJob =
    batchCapturePending || isBatchCaptureJobInFlight(batchCaptureJob?.status);
  const hasCaptureActionLock = hasBlockingRuntimeJob || hasBlockingCaptureJob;

  if (hasBlockingRuntimeJob) {
    return {
      hasBlockingRuntimeJob,
      hasBlockingCaptureJob,
      hasCaptureActionLock,
      captureActionTitle: 'Wait for the current Social runtime job to finish.',
    };
  }
  if (hasBlockingCaptureJob) {
    return {
      hasBlockingRuntimeJob,
      hasBlockingCaptureJob,
      hasCaptureActionLock,
      captureActionTitle: 'Wait for the current Playwright capture job to finish.',
    };
  }

  return {
    hasBlockingRuntimeJob,
    hasBlockingCaptureJob,
    hasCaptureActionLock,
    captureActionTitle: undefined,
  };
};

export const resolveLastBatchResultSummary = (
  result: SocialPublishingImageAddonsBatchResult | null
): LastBatchResultSummary => {
  if (result === null) {
    return {
      completedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      totalCount: 0,
      failureSummary: null,
      primaryIssueSummary: null,
    };
  }

  const hasCaptureResults = result.captureResults.length > 0;
  const completedCount = hasCaptureResults
    ? result.captureResults.filter((entry) => entry.status === 'ok').length
    : result.addons.length;
  const failedCount = hasCaptureResults
    ? result.captureResults.filter((entry) => entry.status === 'failed').length
    : result.failures.length;
  const totalCount = hasCaptureResults
    ? result.captureResults.length
    : result.addons.length + result.failures.length;

  return {
    completedCount,
    failedCount,
    skippedCount: result.captureResults.filter((entry) => entry.status === 'skipped').length,
    totalCount,
    failureSummary: buildSocialPublishingCaptureFailureSummary(result.failures),
    primaryIssueSummary: buildSocialPublishingCapturePrimaryIssueSummary(result.captureResults),
  };
};

export const filterRecentPresetCaptureJobs = (
  jobs: SocialPublishingImageAddonsBatchJob[]
): SocialPublishingImageAddonsBatchJob[] =>
  jobs.filter((job) => (job.request?.playwrightRoutes.length ?? 0) === 0);
