'use client';

import type React from 'react';

import {
  normalizeSocialPublishingCaptureFailureReason,
  resolveSocialPublishingCaptureTargetLabel,
} from '@/features/filemaker/social/shared/social-capture-feedback';
import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

import {
  formatCaptureStatusLabel,
  formatDurationMs,
  hasNonEmptyString,
  readCaptureResultEntries,
} from './SocialCaptureBatchHistory.runtime';

type CaptureTargetResult = NonNullable<
  NonNullable<SocialPublishingImageAddonsBatchJob['result']>['captureResults']
>[number];

const resolveTargetLabel = (
  result: CaptureTargetResult,
  routes: SocialPublishingProgrammableCaptureRoute[]
): string => {
  const title = result.title?.trim();
  return hasNonEmptyString(title)
    ? title
    : resolveSocialPublishingCaptureTargetLabel(result.id, routes);
};

const TargetMetadata = ({
  result,
  stageLabel,
  durationLabel,
}: {
  result: CaptureTargetResult;
  stageLabel: string | null;
  durationLabel: string | null;
}): React.ReactElement => (
  <div className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground'>
    {hasNonEmptyString(stageLabel) ? <span>Stage: {stageLabel}</span> : null}
    {result.attemptCount !== null && result.attemptCount > 0 ? (
      <span>Attempts: {result.attemptCount}</span>
    ) : null}
    {durationLabel !== null ? <span>Duration: {durationLabel}</span> : null}
  </div>
);

const TargetOptionalDetails = ({
  result,
}: {
  result: CaptureTargetResult;
}): React.ReactElement => (
  <>
    {hasNonEmptyString(result.resolvedUrl) ? (
      <div className='mt-1 break-all text-muted-foreground'>URL: {result.resolvedUrl}</div>
    ) : null}
    {hasNonEmptyString(result.artifactName) ? (
      <div className='mt-1 text-muted-foreground'>Artifact: {result.artifactName}</div>
    ) : null}
    {hasNonEmptyString(result.reason) ? (
      <div className='mt-1 text-destructive'>
        Reason: {normalizeSocialPublishingCaptureFailureReason(result.reason)}
      </div>
    ) : null}
  </>
);

const SocialCaptureBatchHistoryTargetRow = ({
  job,
  result,
  routes,
}: {
  job: SocialPublishingImageAddonsBatchJob;
  result: CaptureTargetResult;
  routes: SocialPublishingProgrammableCaptureRoute[];
}): React.ReactElement => {
  const statusLabel = formatCaptureStatusLabel(result.status);
  const stageLabel = formatCaptureStatusLabel(result.stage);
  const durationLabel = formatDurationMs(result.durationMs);

  return (
    <div
      key={`${job.id}-target-${result.id}`}
      className='rounded-lg border border-border/40 bg-background px-3 py-2 text-xs'
    >
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='font-medium text-foreground'>{resolveTargetLabel(result, routes)}</div>
        {hasNonEmptyString(statusLabel) ? (
          <div className='text-muted-foreground'>{statusLabel}</div>
        ) : null}
      </div>
      <TargetMetadata result={result} stageLabel={stageLabel} durationLabel={durationLabel} />
      <TargetOptionalDetails result={result} />
    </div>
  );
};

export const SocialCaptureBatchHistoryTargets = ({
  job,
  routes,
}: {
  job: SocialPublishingImageAddonsBatchJob;
  routes: SocialPublishingProgrammableCaptureRoute[];
}): React.ReactElement | null => {
  const captureResults = readCaptureResultEntries(job);

  if (captureResults.length === 0) {
    return null;
  }

  return (
    <div className='space-y-2'>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        Targets
      </div>
      <div className='space-y-2'>
        {captureResults.map((result) => (
          <SocialCaptureBatchHistoryTargetRow
            key={`${job.id}-target-${result.id}`}
            job={job}
            result={result}
            routes={routes}
          />
        ))}
      </div>
    </div>
  );
};
