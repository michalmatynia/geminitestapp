'use client';

import type React from 'react';

import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import { Button } from '@/shared/ui';

import { SocialCaptureBatchHistoryProgress } from './SocialCaptureBatchHistoryProgress';
import {
  formatTimestamp,
  hasNonEmptyString,
  isProgrammableCaptureJob,
  JOB_STATUS_LABELS,
  resolveCaptureHistoryCounts,
  resolveFailureSummary,
  resolveRetryableFailureCount,
  type CaptureHistoryRetryKind,
} from './SocialCaptureBatchHistory.runtime';
import { SocialCaptureBatchHistoryTargets } from './SocialCaptureBatchHistoryTargets';

type SocialCaptureBatchHistoryItemProps = {
  job: SocialPublishingImageAddonsBatchJob;
  routes: SocialPublishingProgrammableCaptureRoute[];
  retryKind: CaptureHistoryRetryKind | undefined;
  retryActionLabel: string | undefined;
  retryDisabled: boolean;
  retryTitle: string | undefined;
  onRetryFailed: ((job: SocialPublishingImageAddonsBatchJob) => void) | undefined;
};

const resolveRetryActionLabel = (retryKind: CaptureHistoryRetryKind): string =>
  retryKind === 'preset' ? 'Retry failed presets' : 'Retry failed routes';

const SocialCaptureBatchHistoryRetryButton = ({
  job,
  retryKind,
  retryActionLabel,
  retryDisabled,
  retryTitle,
  onRetryFailed,
  retryableFailureCount,
}: SocialCaptureBatchHistoryItemProps & {
  retryableFailureCount: number;
}): React.ReactElement | null => {
  if (retryableFailureCount === 0 || retryKind === undefined || onRetryFailed === undefined) {
    return null;
  }

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => onRetryFailed(job)}
      disabled={retryDisabled}
      title={retryTitle}
    >
      {retryActionLabel ?? resolveRetryActionLabel(retryKind)}
    </Button>
  );
};

const SocialCaptureBatchHistoryItemHeader = ({
  job,
  routes,
  retryKind,
  retryActionLabel,
  retryDisabled,
  retryTitle,
  onRetryFailed,
}: SocialCaptureBatchHistoryItemProps): React.ReactElement => {
  const retryableFailureCount = resolveRetryableFailureCount({ job, retryKind, routes });
  const baseUrl = job.request?.baseUrl ?? null;

  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='space-y-1'>
        <div className='text-sm font-medium text-foreground'>Run {job.runId}</div>
        <div className='flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
          <span>{JOB_STATUS_LABELS[job.status]}</span>
          <span>{formatTimestamp(job.updatedAt)}</span>
          <span>{isProgrammableCaptureJob(job) ? 'Programmable capture' : 'Preset capture'}</span>
          {hasNonEmptyString(baseUrl) ? (
            <span className='break-all'>Base URL: {baseUrl}</span>
          ) : null}
        </div>
      </div>
      <SocialCaptureBatchHistoryRetryButton
        job={job}
        routes={routes}
        retryKind={retryKind}
        retryActionLabel={retryActionLabel}
        retryDisabled={retryDisabled}
        retryTitle={retryTitle}
        onRetryFailed={onRetryFailed}
        retryableFailureCount={retryableFailureCount}
      />
    </div>
  );
};

const SocialCaptureBatchHistoryCounts = ({
  job,
}: {
  job: SocialPublishingImageAddonsBatchJob;
}): React.ReactElement => {
  const counts = resolveCaptureHistoryCounts(job);
  const presetCount = job.request?.presetIds.length ?? 0;
  const routeCount = job.request?.playwrightRoutes.length ?? 0;

  return (
    <div className='flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
      <span>Completed: {counts.completedCount}</span>
      <span>Failed: {counts.failedCount}</span>
      {counts.skippedCount > 0 ? <span>Skipped: {counts.skippedCount}</span> : null}
      <span>Total: {counts.totalCount}</span>
      {presetCount > 0 ? <span>Presets: {presetCount}</span> : null}
      {routeCount > 0 ? <span>Routes: {routeCount}</span> : null}
    </div>
  );
};

export const SocialCaptureBatchHistoryItem = (
  props: SocialCaptureBatchHistoryItemProps
): React.ReactElement => {
  const resolvedRoutes = props.job.request?.playwrightRoutes ?? props.routes;
  const failureSummary = resolveFailureSummary({ job: props.job, routes: resolvedRoutes });
  const jobError = props.job.error ?? null;

  return (
    <div className='space-y-3 rounded-lg border border-border/50 bg-background/70 px-3 py-3'>
      <SocialCaptureBatchHistoryItemHeader {...props} routes={resolvedRoutes} />
      <SocialCaptureBatchHistoryCounts job={props.job} />
      <SocialCaptureBatchHistoryProgress job={props.job} routes={resolvedRoutes} />
      <SocialCaptureBatchHistoryTargets job={props.job} routes={resolvedRoutes} />
      {hasNonEmptyString(failureSummary) ? (
        <div className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
          Failed targets: {failureSummary}
        </div>
      ) : null}
      {hasNonEmptyString(jobError) ? (
        <div className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
          {jobError}
        </div>
      ) : null}
    </div>
  );
};
