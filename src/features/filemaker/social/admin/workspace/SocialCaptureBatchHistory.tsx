'use client';

import type React from 'react';

import type {
  SocialPublishingImageAddonsBatchJob,
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

import { SocialCaptureBatchHistoryItem } from './SocialCaptureBatchHistoryItem';
import type { CaptureHistoryRetryKind } from './SocialCaptureBatchHistory.runtime';

export type SocialCaptureBatchHistoryConfig = {
  title: string;
  description: string;
  emptyMessage: string;
  retryKind?: CaptureHistoryRetryKind;
  retryActionLabel?: string;
  retryDisabled?: boolean;
  retryTitle?: string;
};

export type SocialCaptureBatchHistoryActions = {
  onRetryFailed?: (job: SocialPublishingImageAddonsBatchJob) => void;
};

export function SocialCaptureBatchHistory({
  config,
  jobs,
  routes = [],
  actions = {},
}: {
  config: SocialCaptureBatchHistoryConfig;
  jobs: SocialPublishingImageAddonsBatchJob[];
  routes?: SocialPublishingProgrammableCaptureRoute[];
  actions?: SocialCaptureBatchHistoryActions;
}): React.ReactElement {
  const {
    title,
    description,
    emptyMessage,
    retryKind,
    retryActionLabel,
    retryDisabled = false,
    retryTitle,
  } = config;
  const { onRetryFailed } = actions;

  return (
    <div className='space-y-3 rounded-xl border border-border/60 bg-background/40 p-4'>
      <div>
        <div className='text-sm font-semibold text-foreground'>{title}</div>
        <div className='text-xs text-muted-foreground'>{description}</div>
      </div>
      {jobs.length === 0 ? (
        <div className='rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground'>
          {emptyMessage}
        </div>
      ) : (
        <div className='space-y-3'>
          {jobs.map((job) => (
            <SocialCaptureBatchHistoryItem
              key={job.id}
              job={job}
              routes={routes}
              retryKind={retryKind}
              retryActionLabel={retryActionLabel}
              retryDisabled={retryDisabled}
              retryTitle={retryTitle}
              onRetryFailed={onRetryFailed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SocialCaptureBatchHistory;
