'use client';

import React from 'react';

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { formatDatetimeDisplay } from './SocialPublishingPage.Constants';
import { SocialJobStatusPill } from './SocialJobStatusPill';
import {
  emptyToUndefined,
  formatTitleParts,
  runtimeJobFailedReason,
  runtimeJobId,
  runtimeJobStatus,
  SocialRuntimeJobsRow,
} from './SocialPost.VisualsRuntime';
import type { SocialPostListContext } from './SocialPost.ListRuntime';

type VisualAnalysisState = {
  error: string;
  hasAnalysis: boolean;
  highlightCount: number;
  jobId: string;
  modelId: string;
  pillStatus: string;
  pillTitle: string;
  updatedAt: string | null;
};

const displayOrDash = (value: string): string => {
  if (value.length > 0) return value;
  return '-';
};

const savedVisualError = (post: SocialPublishingPost): string =>
  post.visualAnalysisError?.trim() ?? '';

const liveVisualStatus = (context: SocialPostListContext, isActive: boolean): string => {
  if (!isActive) return '';
  return runtimeJobStatus(context.currentVisualAnalysisJob);
};

const resolveVisualStatus = (
  context: SocialPostListContext,
  isActive: boolean,
  post: SocialPublishingPost
): string | null => {
  const liveStatus = liveVisualStatus(context, isActive);
  if (liveStatus.length > 0) return liveStatus;
  return post.visualAnalysisStatus;
};

const resolveVisualError = ({
  context,
  isActive,
  post,
  status,
}: {
  context: SocialPostListContext;
  isActive: boolean;
  post: SocialPublishingPost;
  status: string | null;
}): string => {
  const liveError = isActive ? runtimeJobFailedReason(context.currentVisualAnalysisJob) : '';
  if (liveError.length > 0) return liveError;
  if (status === 'failed') return savedVisualError(post);
  return '';
};

const resolveVisualJobId = (
  context: SocialPostListContext,
  isActive: boolean,
  post: SocialPublishingPost
): string => {
  const liveJobId = isActive ? runtimeJobId(context.currentVisualAnalysisJob) : '';
  if (liveJobId.length > 0) return liveJobId;
  return post.visualAnalysisJobId?.trim() ?? '';
};

const activeVisualProgressMessage = (
  context: SocialPostListContext,
  isActive: boolean
): string | null => {
  if (!isActive) return null;
  return context.currentVisualAnalysisJob?.progress?.message ?? null;
};

const activeVisualFailedReason = (
  context: SocialPostListContext,
  isActive: boolean
): string | null => {
  if (!isActive) return null;
  return context.currentVisualAnalysisJob?.failedReason ?? null;
};

const savedVisualErrorTitle = ({
  context,
  error,
  isActive,
  status,
}: {
  context: SocialPostListContext;
  error: string;
  isActive: boolean;
  status: string | null;
}): string | null => {
  if (!isActive) return null;
  if (status !== 'failed') return null;
  if (runtimeJobFailedReason(context.currentVisualAnalysisJob).length > 0) return null;
  return error.length > 0 ? error : null;
};

const visualJobIdTitle = (jobId: string): string | null => {
  if (jobId.length === 0) return null;
  return `Queue job: ${jobId}`;
};

const resolveVisualPillTitle = ({
  context,
  error,
  isActive,
  jobId,
  status,
}: {
  context: SocialPostListContext;
  error: string;
  isActive: boolean;
  jobId: string;
  status: string | null;
}): string => formatTitleParts([
  activeVisualProgressMessage(context, isActive),
  activeVisualFailedReason(context, isActive),
  savedVisualErrorTitle({ context, error, isActive, status }),
  visualJobIdTitle(jobId),
]);

const buildVisualAnalysisState = ({
  context,
  isActive,
  post,
}: {
  context: SocialPostListContext;
  isActive: boolean;
  post: SocialPublishingPost;
}): VisualAnalysisState => {
  const status = resolveVisualStatus(context, isActive, post);
  const jobId = resolveVisualJobId(context, isActive, post);
  const error = resolveVisualError({ context, isActive, post, status });
  const highlightCount = post.visualHighlights.length;

  return {
    error,
    hasAnalysis: (post.visualSummary?.trim().length ?? 0) > 0 || highlightCount > 0 || post.visualAnalysisStatus !== null,
    highlightCount,
    jobId,
    modelId: post.visualAnalysisModelId?.trim() ?? '',
    pillStatus: status ?? 'completed',
    pillTitle: resolveVisualPillTitle({ context, error, isActive, jobId, status }),
    updatedAt: post.visualAnalysisUpdatedAt,
  };
};

function VisualAnalysisDetails({
  state,
}: {
  state: VisualAnalysisState;
}): React.JSX.Element | null {
  if (!state.hasAnalysis) return null;
  return (
    <div className='mt-1 flex flex-wrap items-center gap-2'>
      <SocialJobStatusPill
        status={state.pillStatus}
        label='Image analysis'
        title={emptyToUndefined(state.pillTitle)}
        className='text-[10px]'
      />
      {state.updatedAt !== null ? (
        <span>Analyzed {displayOrDash(formatDatetimeDisplay(state.updatedAt))}</span>
      ) : null}
      {state.modelId.length > 0 ? <span>Model: {state.modelId}</span> : null}
      {state.jobId.length > 0 ? <span>Job: {state.jobId}</span> : null}
      {state.highlightCount > 0 ? (
        <span>
          {state.highlightCount} highlight{state.highlightCount === 1 ? '' : 's'}
        </span>
      ) : null}
      {state.error.length > 0 ? <span>Failure: {state.error}</span> : null}
    </div>
  );
}

export function SocialPostListVisualAnalysis({
  context,
  isActive,
  post,
}: {
  context: SocialPostListContext;
  isActive: boolean;
  post: SocialPublishingPost;
}): React.JSX.Element {
  return (
    <>
      <VisualAnalysisDetails state={buildVisualAnalysisState({ context, isActive, post })} />
      {isActive ? <SocialRuntimeJobsRow context={context} /> : null}
    </>
  );
}
