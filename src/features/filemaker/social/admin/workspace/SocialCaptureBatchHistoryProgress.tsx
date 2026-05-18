'use client';

import type React from 'react';

import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import { resolveSocialPublishingCaptureTargetLabel } from '@/features/filemaker/social/shared/social-capture-feedback';

import {
  formatCaptureStatusLabel,
  hasNonEmptyString,
  type CaptureProgressTarget,
  resolveProgressTargets,
} from './SocialCaptureBatchHistory.runtime';

const hasProgressContent = (
  message: string | null,
  targets: CaptureProgressTarget[]
): boolean => hasNonEmptyString(message) || targets.length > 0;

const ProgressMessage = ({ message }: { message: string | null }): React.ReactElement | null =>
  hasNonEmptyString(message) ? (
    <div className='rounded-lg border border-border/40 bg-background px-3 py-2 text-xs text-muted-foreground'>
      {message}
    </div>
  ) : null;

const ProgressTargetCard = ({
  job,
  target,
  routes,
}: {
  job: SocialPublishingImageAddonsBatchJob;
  target: CaptureProgressTarget;
  routes: SocialPublishingProgrammableCaptureRoute[];
}): React.ReactElement => {
  const statusLabel = formatCaptureStatusLabel(target.status);

  return (
    <div
      key={`${job.id}-${target.label}-${target.id}`}
      className='rounded-lg border border-border/40 bg-background px-3 py-2 text-xs'
    >
      <div className='font-medium text-foreground'>{target.label}</div>
      <div className='mt-1 text-muted-foreground'>
        {resolveSocialPublishingCaptureTargetLabel(target.id, routes)}
      </div>
      {hasNonEmptyString(statusLabel) ? (
        <div className='mt-1 text-muted-foreground'>{statusLabel}</div>
      ) : null}
    </div>
  );
};

export const SocialCaptureBatchHistoryProgress = ({
  job,
  routes,
}: {
  job: SocialPublishingImageAddonsBatchJob;
  routes: SocialPublishingProgrammableCaptureRoute[];
}): React.ReactElement | null => {
  const message = job.progress?.message ?? null;
  const targets = resolveProgressTargets(job);

  if (!hasProgressContent(message, targets)) {
    return null;
  }

  return (
    <div className='space-y-2'>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        Progress
      </div>
      <ProgressMessage message={message} />
      {targets.length > 0 ? (
        <div className='space-y-2'>
          {targets.map((target) => (
            <ProgressTargetCard
              key={`${job.id}-${target.label}-${target.id}`}
              job={job}
              target={target}
              routes={routes}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
