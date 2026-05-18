import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import {
  buildSocialPublishingCaptureFailureSummary,
  resolveFailedSocialPublishingProgrammableCaptureRoutes,
  resolveFailedSocialPublishingPresetIds,
} from '@/features/filemaker/social/shared/social-capture-feedback';

export const JOB_STATUS_LABELS: Record<SocialPublishingImageAddonsBatchJob['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

export type CaptureHistoryRetryKind = 'preset' | 'programmable';

export type CaptureProgressTarget = {
  id: string;
  label: string;
  status: string | null;
};

export type CaptureHistoryCounts = {
  completedCount: number;
  failedCount: number;
  skippedCount: number;
  totalCount: number;
};

type CaptureResultEntries = NonNullable<
  SocialPublishingImageAddonsBatchJob['result']
>['captureResults'];

export const hasNonEmptyString = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim().length > 0;

export const readCaptureResultEntries = (
  job: SocialPublishingImageAddonsBatchJob
): CaptureResultEntries => {
  const captureResults = (job.result as { captureResults?: unknown } | null)?.captureResults;
  return Array.isArray(captureResults) ? (captureResults as CaptureResultEntries) : [];
};

export const formatTimestamp = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const formatCaptureStatusLabel = (
  status: string | null | undefined
): string | null => {
  const normalized = status?.trim();
  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  return normalized
    .split(/[_\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const formatDurationMs = (value: number | null | undefined): string | null => {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return null;
  }
  if (value < 1000) {
    return `${value} ms`;
  }

  const seconds = value / 1000;
  return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)} s`;
};

const readProgressTotalCount = (job: SocialPublishingImageAddonsBatchJob): number | null =>
  typeof job.progress?.totalCount === 'number' ? job.progress.totalCount : null;

const readCaptureResultsCount = (job: SocialPublishingImageAddonsBatchJob): number | null => {
  const captureResultsCount = readCaptureResultEntries(job).length;
  return captureResultsCount > 0 ? captureResultsCount : null;
};

const readProgrammableRouteCount = (job: SocialPublishingImageAddonsBatchJob): number | null => {
  const programmableRouteCount = job.request?.playwrightRoutes.length ?? 0;
  return programmableRouteCount > 0 ? programmableRouteCount : null;
};

const readRequestedPresetCount = (job: SocialPublishingImageAddonsBatchJob): number | null => {
  const requestedPresetCount = job.result?.requestedPresetCount ?? job.request?.presetIds.length ?? 0;
  return requestedPresetCount > 0 ? requestedPresetCount : null;
};

const readResultTargetCount = (job: SocialPublishingImageAddonsBatchJob): number =>
  (job.result?.addons.length ?? 0) + (job.result?.failures.length ?? 0);

export const resolveJobTotalCount = (job: SocialPublishingImageAddonsBatchJob): number => {
  return (
    readProgressTotalCount(job) ??
    readCaptureResultsCount(job) ??
    readProgrammableRouteCount(job) ??
    readRequestedPresetCount(job) ??
    readResultTargetCount(job)
  );
};

const countCaptureResultsByStatus = (
  job: SocialPublishingImageAddonsBatchJob,
  status: 'ok' | 'failed' | 'skipped'
): number => readCaptureResultEntries(job).filter((result) => result.status === status).length;

const hasStoredCaptureResults = (job: SocialPublishingImageAddonsBatchJob): boolean =>
  readCaptureResultEntries(job).length > 0;

const resolveCompletedCount = (job: SocialPublishingImageAddonsBatchJob): number =>
  hasStoredCaptureResults(job)
    ? countCaptureResultsByStatus(job, 'ok')
    : job.result?.addons.length ?? 0;

const resolveFailedCount = (job: SocialPublishingImageAddonsBatchJob): number =>
  hasStoredCaptureResults(job)
    ? countCaptureResultsByStatus(job, 'failed')
    : job.result?.failures.length ?? 0;

export const resolveCaptureHistoryCounts = (
  job: SocialPublishingImageAddonsBatchJob
): CaptureHistoryCounts => ({
  completedCount: resolveCompletedCount(job),
  failedCount: resolveFailedCount(job),
  skippedCount: countCaptureResultsByStatus(job, 'skipped'),
  totalCount: resolveJobTotalCount(job),
});

export const resolveRetryableFailureCount = ({
  job,
  retryKind,
  routes,
}: {
  job: SocialPublishingImageAddonsBatchJob;
  retryKind: CaptureHistoryRetryKind | undefined;
  routes: SocialPublishingProgrammableCaptureRoute[];
}): number => {
  const failures = job.result?.failures ?? [];
  if (retryKind === undefined) {
    return 0;
  }
  if (retryKind === 'preset') {
    return resolveFailedSocialPublishingPresetIds(failures).length;
  }

  return resolveFailedSocialPublishingProgrammableCaptureRoutes(
    failures,
    job.request?.playwrightRoutes ?? routes
  ).length;
};

export const resolveFailureSummary = ({
  job,
  routes,
}: {
  job: SocialPublishingImageAddonsBatchJob;
  routes: SocialPublishingProgrammableCaptureRoute[];
}): string | null => {
  if (job.result === null) {
    return null;
  }

  return buildSocialPublishingCaptureFailureSummary(job.result.failures, {
    routes,
    maxItems: 2,
  });
};

const buildProgressTarget = ({
  id,
  label,
  status,
}: CaptureProgressTarget): CaptureProgressTarget | null =>
  hasNonEmptyString(id) ? { id, label, status } : null;

const readCurrentCaptureId = (job: SocialPublishingImageAddonsBatchJob): string | null =>
  job.progress?.currentCaptureId ?? null;

const readLastCaptureId = (job: SocialPublishingImageAddonsBatchJob): string | null =>
  job.progress?.lastCaptureId ?? null;

const buildCurrentProgressTarget = (
  job: SocialPublishingImageAddonsBatchJob
): CaptureProgressTarget | null =>
  buildProgressTarget({
    id: readCurrentCaptureId(job) ?? '',
    label: 'Current target',
    status: job.progress?.currentCaptureStatus ?? null,
  });

const buildLastProgressTarget = (
  job: SocialPublishingImageAddonsBatchJob
): CaptureProgressTarget | null => {
  const currentCaptureId = readCurrentCaptureId(job);
  const lastCaptureId = readLastCaptureId(job);

  if (lastCaptureId === currentCaptureId) {
    return null;
  }

  return buildProgressTarget({
    id: lastCaptureId ?? '',
    label: 'Last processed',
    status: job.progress?.lastCaptureStatus ?? null,
  });
};

export const resolveProgressTargets = (
  job: SocialPublishingImageAddonsBatchJob
): CaptureProgressTarget[] =>
  [buildCurrentProgressTarget(job), buildLastProgressTarget(job)].filter(
    (target): target is CaptureProgressTarget => target !== null
  );

export const isProgrammableCaptureJob = (job: SocialPublishingImageAddonsBatchJob): boolean =>
  (job.request?.playwrightRoutes.length ?? 0) > 0;
