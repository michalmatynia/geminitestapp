'use client';

import React from 'react';

import { FormSection } from '@/shared/ui';
import { useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel, SocialJobStatusPill } from './SocialJobStatusPill';
import {
  emptyToUndefined,
  formatRuntimeJobTitle,
  hasText,
  runtimeJobFailedReason,
  runtimeJobId,
  runtimeJobStatus,
  SocialRuntimeJobsRow,
  type SocialVisualsContext,
} from './SocialPost.VisualsRuntime';

type VisualAnalysisMetadata = {
  errorMessage: string;
  hasFailedStatus: boolean;
  hasMetadata: boolean;
  jobId: string;
  modelId: string;
  savedError: string;
  status: string | null;
  statusLabel: string | null;
  title: string;
  updatedAt: string | null;
};

type VisualAnalysisContent = {
  hasAnalysis: boolean;
  highlights: string[];
  summary: string;
};

const savedVisualAnalysisStatus = (context: SocialVisualsContext): string | null =>
  context.activePost?.visualAnalysisStatus ?? null;

const visualAnalysisStatus = (context: SocialVisualsContext): string | null => {
  const liveStatus = runtimeJobStatus(context.currentVisualAnalysisJob);
  if (liveStatus.length > 0) return liveStatus;
  return savedVisualAnalysisStatus(context);
};

const visualAnalysisJobId = (context: SocialVisualsContext): string => {
  const liveJobId = runtimeJobId(context.currentVisualAnalysisJob);
  if (liveJobId.length > 0) return liveJobId;
  return context.activePost?.visualAnalysisJobId?.trim() ?? '';
};

const visualAnalysisModelId = (context: SocialVisualsContext): string =>
  context.activePost?.visualAnalysisModelId?.trim() ?? '';

const visualAnalysisUpdatedAt = (context: SocialVisualsContext): string | null =>
  context.activePost?.visualAnalysisUpdatedAt ?? null;

const savedVisualAnalysisError = (context: SocialVisualsContext): string =>
  context.activePost?.visualAnalysisError?.trim() ?? '';

const buildVisualAnalysisContent = (context: SocialVisualsContext): VisualAnalysisContent => {
  const summary = context.activePost?.visualSummary?.trim() ?? '';
  const highlights = context.activePost?.visualHighlights ?? [];
  return {
    hasAnalysis: summary.length > 0 || highlights.length > 0,
    highlights,
    summary,
  };
};

const hasVisualAnalysisMetadata = (metadata: VisualAnalysisMetadata): boolean =>
  hasText(metadata.statusLabel) ||
  metadata.updatedAt !== null ||
  metadata.modelId.length > 0 ||
  metadata.jobId.length > 0;

const buildVisualAnalysisMetadata = (
  context: SocialVisualsContext
): VisualAnalysisMetadata => {
  const status = visualAnalysisStatus(context);
  const hasFailedStatus = status === 'failed';
  const savedError = savedVisualAnalysisError(context);
  const liveError = runtimeJobFailedReason(context.currentVisualAnalysisJob);
  const jobId = visualAnalysisJobId(context);
  const metadata = {
    errorMessage: liveError.length > 0 ? liveError : failedSavedError(hasFailedStatus, savedError),
    hasFailedStatus,
    hasMetadata: false,
    jobId,
    modelId: visualAnalysisModelId(context),
    savedError,
    status,
    statusLabel: getSocialJobStatusLabel(status),
    title: formatRuntimeJobTitle(context.currentVisualAnalysisJob, failedSavedError(hasFailedStatus, savedError)),
    updatedAt: visualAnalysisUpdatedAt(context),
  };

  return {
    ...metadata,
    hasMetadata: hasVisualAnalysisMetadata(metadata),
  };
};

const failedSavedError = (hasFailedStatus: boolean, savedError: string): string => {
  if (!hasFailedStatus) return '';
  return savedError;
};

function StaleAnalysisWarning({ context }: { context: SocialVisualsContext }): React.JSX.Element | null {
  if (!context.isSavedVisualAnalysisStale || !context.hasSavedVisualAnalysis) return null;
  return (
    <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
      Saved image analysis exists for this draft, but the selected visuals changed.
      {' '}Rerun image analysis before generating new copy from it.
    </div>
  );
}

function VisualAnalysisErrorAlert({
  metadata,
}: {
  metadata: VisualAnalysisMetadata;
}): React.JSX.Element | null {
  if (metadata.errorMessage.length === 0) return null;
  return (
    <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
      {metadata.errorMessage}
    </div>
  );
}

function VisualAnalysisStatusPill({
  metadata,
}: {
  metadata: VisualAnalysisMetadata;
}): React.JSX.Element | null {
  if (metadata.status === null || !hasText(metadata.statusLabel)) return null;
  return (
    <div className='mb-1'>
      <SocialJobStatusPill
        status={metadata.status}
        label='Image analysis'
        title={emptyToUndefined(resolveMetadataTitle(metadata))}
        className='text-[10px]'
      />
    </div>
  );
}

const fallbackQueueJobTitle = (jobId: string): string => {
  if (jobId.length === 0) return '';
  return `Queue job: ${jobId}`;
};

const resolveMetadataTitle = (metadata: VisualAnalysisMetadata): string => {
  if (metadata.title.length > 0) return metadata.title;
  return fallbackQueueJobTitle(metadata.jobId);
};

function VisualAnalysisMetadataPanel({
  metadata,
}: {
  metadata: VisualAnalysisMetadata;
}): React.JSX.Element | null {
  if (!metadata.hasMetadata) return null;
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
      <VisualAnalysisStatusPill metadata={metadata} />
      {hasText(metadata.statusLabel) ? <div>Status: {metadata.statusLabel}</div> : null}
      {metadata.updatedAt !== null ? (
        <div>Analyzed: {new Date(metadata.updatedAt).toLocaleString()}</div>
      ) : null}
      {metadata.modelId.length > 0 ? <div>Model: {metadata.modelId}</div> : null}
      {metadata.jobId.length > 0 ? <div>Queue job: {metadata.jobId}</div> : null}
      {metadata.hasFailedStatus && metadata.savedError.length > 0 ? (
        <div>Failure: {metadata.savedError}</div>
      ) : null}
    </div>
  );
}

function EmptyAnalysisNotice({ content }: { content: VisualAnalysisContent }): React.JSX.Element | null {
  if (content.hasAnalysis) return null;
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
      No saved analysis summary yet. The queue metadata above reflects the latest image-analysis run for this post.
    </div>
  );
}

function VisualSummaryBlock({ content }: { content: VisualAnalysisContent }): React.JSX.Element | null {
  if (content.summary.length === 0) return null;
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
      {content.summary}
    </div>
  );
}

function VisualHighlightsBlock({ content }: { content: VisualAnalysisContent }): React.JSX.Element | null {
  if (content.highlights.length === 0) return null;
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
      <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Highlights</div>
      <ul className='mt-2 space-y-1 text-sm text-muted-foreground'>
        {content.highlights.map((highlight) => (
          <li key={highlight}>- {highlight}</li>
        ))}
      </ul>
    </div>
  );
}

export function SocialPostVisualAnalysisResultSection(): React.JSX.Element | null {
  const context = useSocialPostContext();
  const content = buildVisualAnalysisContent(context);
  const metadata = buildVisualAnalysisMetadata(context);
  const hasSection = content.hasAnalysis || metadata.hasMetadata;

  if (!hasSection) return null;

  return (
    <FormSection title='Image analysis result' className='space-y-3'>
      <SocialRuntimeJobsRow context={context} savedVisualFailure={metadata.savedError} />
      <StaleAnalysisWarning context={context} />
      <VisualAnalysisErrorAlert metadata={metadata} />
      <VisualAnalysisMetadataPanel metadata={metadata} />
      <EmptyAnalysisNotice content={content} />
      <VisualSummaryBlock content={content} />
      <VisualHighlightsBlock content={content} />
    </FormSection>
  );
}
