'use client';

import React from 'react';

import { PipelineAlertBox, type PipelineAlertTone } from './SocialPost.PipelineAlertBox';
import { type useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel } from './SocialJobStatusPill';

type SocialContext = ReturnType<typeof useSocialPostContext>;
type UpdatedAtValue = Date | number | string | null;

type VisualAnalysisAlertState = {
  error: string;
  hasFailedStatus: boolean;
  hasLatestMetadata: boolean;
  hasReadyAnalysis: boolean;
  jobId: string;
  modelId: string;
  readyHighlightCount: number;
  shouldWarnStale: boolean;
  statusLabel: string | null;
  statusSourceLabel: 'Latest run' | 'Saved run';
  updatedAt: UpdatedAtValue;
};

type VisualMetadataArgs = {
  jobId: string;
  modelId: string;
  statusLabel: string | null;
  updatedAt: UpdatedAtValue;
};

const SUCCESS_DETAIL_CLASS = 'mt-1 text-[11px] text-emerald-950/80 dark:text-emerald-100/80';

const hasText = (value: string | null | undefined): boolean =>
  (value?.length ?? 0) > 0;

const latestVisualAnalysisStatus = (context: SocialContext): string | null =>
  context.currentVisualAnalysisJob?.status ??
  context.activePost?.visualAnalysisStatus ??
  null;

const visualAnalysisStatusKey = (status: string | null): string =>
  status?.trim().toLowerCase() ?? '';

const savedVisualAnalysisModelId = (context: SocialContext): string =>
  context.activePost?.visualAnalysisModelId?.trim() ?? '';

const savedVisualAnalysisJobId = (context: SocialContext): string =>
  context.activePost?.visualAnalysisJobId?.trim() ?? '';

const liveVisualAnalysisJobId = (context: SocialContext): string =>
  context.currentVisualAnalysisJob?.id.trim() ?? '';

const visualAnalysisUpdatedAt = (context: SocialContext): UpdatedAtValue =>
  context.activePost?.visualAnalysisUpdatedAt ?? null;

const visualAnalysisLiveError = (context: SocialContext): string =>
  context.currentVisualAnalysisJob?.failedReason?.trim() ?? '';

const savedVisualAnalysisError = (context: SocialContext): string =>
  context.activePost?.visualAnalysisError?.trim() ?? '';

const readyVisualHighlightCount = (context: SocialContext): number =>
  context.visualAnalysisResult?.highlights.length ?? 0;

const hasLiveVisualAnalysisJob = (context: SocialContext): boolean =>
  hasText(context.currentVisualAnalysisJob?.status);

const preferredVisualAnalysisJobId = (context: SocialContext): string => {
  const liveJobId = liveVisualAnalysisJobId(context);
  if (liveJobId.length > 0) return liveJobId;
  return savedVisualAnalysisJobId(context);
};

const visualAnalysisStatusSourceLabel = (
  hasLiveJob: boolean
): VisualAnalysisAlertState['statusSourceLabel'] => {
  if (hasLiveJob) return 'Latest run';
  return 'Saved run';
};

const hasReadyVisualAnalysis = (
  context: SocialContext,
  highlightCount: number
): boolean =>
  (context.visualAnalysisResult?.summary.trim().length ?? 0) > 0 || highlightCount > 0;

const hasVisualAnalysisMetadata = ({
  jobId,
  modelId,
  statusLabel,
  updatedAt,
}: VisualMetadataArgs): boolean =>
  hasText(statusLabel) || updatedAt !== null || modelId.length > 0 || jobId.length > 0;

const shouldWarnStaleAnalysis = (context: SocialContext, hasLiveJob: boolean): boolean =>
  context.isSavedVisualAnalysisStale && context.hasSavedVisualAnalysis && !hasLiveJob;

const latestVisualAnalysisError = (
  context: SocialContext,
  hasFailedStatus: boolean
): string => {
  const liveError = visualAnalysisLiveError(context);
  if (liveError.length > 0) return liveError;
  if (hasFailedStatus) return savedVisualAnalysisError(context);
  return '';
};

const buildVisualAnalysisAlertState = (
  context: SocialContext
): VisualAnalysisAlertState => {
  const latestStatus = latestVisualAnalysisStatus(context);
  const statusLabel = getSocialJobStatusLabel(latestStatus);
  const updatedAt = visualAnalysisUpdatedAt(context);
  const modelId = savedVisualAnalysisModelId(context);
  const jobId = preferredVisualAnalysisJobId(context);
  const highlightCount = readyVisualHighlightCount(context);
  const hasLiveJob = hasLiveVisualAnalysisJob(context);
  const hasFailedStatus = visualAnalysisStatusKey(latestStatus) === 'failed';

  return {
    error: latestVisualAnalysisError(context, hasFailedStatus),
    hasFailedStatus,
    hasLatestMetadata: hasVisualAnalysisMetadata({ jobId, modelId, statusLabel, updatedAt }),
    hasReadyAnalysis: hasReadyVisualAnalysis(context, highlightCount),
    jobId,
    modelId,
    readyHighlightCount: highlightCount,
    shouldWarnStale: shouldWarnStaleAnalysis(context, hasLiveJob),
    statusLabel,
    statusSourceLabel: visualAnalysisStatusSourceLabel(hasLiveJob),
    updatedAt,
  };
};

const formatHighlightText = (count: number): string => {
  if (count <= 0) return '';
  return ` ${count} highlight${count === 1 ? '' : 's'}.`;
};

const formatReadyStatus = (visual: VisualAnalysisAlertState): string => {
  if (!hasText(visual.statusLabel)) return '';
  return `${visual.statusSourceLabel}: ${visual.statusLabel}. `;
};

const formatReadyAnalyzedAt = (updatedAt: UpdatedAtValue): string => {
  if (updatedAt === null) return '';
  return `Analyzed: ${new Date(updatedAt).toLocaleString()}. `;
};

const formatReadyModel = (modelId: string): string => {
  if (modelId.length === 0) return '';
  return `Model: ${modelId}. `;
};

const formatReadyJob = (jobId: string): string => {
  if (jobId.length === 0) return '';
  return `Queue job: ${jobId}.`;
};

const formatMetadataStatus = (statusLabel: string | null): string => {
  if (!hasText(statusLabel)) return '';
  return ` ${statusLabel}.`;
};

const formatMetadataAnalyzedAt = (updatedAt: UpdatedAtValue): string => {
  if (updatedAt === null) return '';
  return ` Analyzed: ${new Date(updatedAt).toLocaleString()}.`;
};

const formatMetadataModel = (modelId: string): string => {
  if (modelId.length === 0) return '';
  return ` Model: ${modelId}.`;
};

const formatMetadataJob = (jobId: string): string => {
  if (jobId.length === 0) return '';
  return ` Queue job: ${jobId}.`;
};

const metadataAlertTone = (visual: VisualAnalysisAlertState): PipelineAlertTone => {
  if (visual.hasFailedStatus) return 'error';
  return 'neutral';
};

function StaleVisualAnalysisAlert({
  busy,
  visual,
}: {
  busy: boolean;
  visual: VisualAnalysisAlertState;
}): React.JSX.Element | null {
  if (!visual.shouldWarnStale || busy) return null;
  return (
    <PipelineAlertBox tone='warning'>
      Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.
    </PipelineAlertBox>
  );
}

function ReadyVisualMetadata({ visual }: { visual: VisualAnalysisAlertState }): React.JSX.Element | null {
  if (!visual.hasLatestMetadata) return null;
  return (
    <div className={SUCCESS_DETAIL_CLASS}>
      {formatReadyStatus(visual)}
      {formatReadyAnalyzedAt(visual.updatedAt)}
      {formatReadyModel(visual.modelId)}
      {formatReadyJob(visual.jobId)}
    </div>
  );
}

function ReadyVisualError({ visual }: { visual: VisualAnalysisAlertState }): React.JSX.Element | null {
  if (visual.error.length === 0) return null;
  return <div className={SUCCESS_DETAIL_CLASS}>Latest failure: {visual.error}</div>;
}

function ReadyVisualAnalysisAlert({
  busy,
  visual,
}: {
  busy: boolean;
  visual: VisualAnalysisAlertState;
}): React.JSX.Element | null {
  if (!visual.hasReadyAnalysis || busy) return null;
  return (
    <PipelineAlertBox tone='success'>
      Image analysis ready for this draft.
      {formatHighlightText(visual.readyHighlightCount)}
      {' '}Open the modal to review it or start the post-generation pass.
      <ReadyVisualMetadata visual={visual} />
      <ReadyVisualError visual={visual} />
    </PipelineAlertBox>
  );
}

function MetadataVisualFailure({ visual }: { visual: VisualAnalysisAlertState }): React.JSX.Element | null {
  if (visual.error.length === 0) return null;
  return <div className='mt-1'>Failure: {visual.error}</div>;
}

function MetadataVisualAnalysisAlert({
  busy,
  visual,
}: {
  busy: boolean;
  visual: VisualAnalysisAlertState;
}): React.JSX.Element | null {
  if (visual.hasReadyAnalysis || !visual.hasLatestMetadata || busy) return null;
  return (
    <PipelineAlertBox tone={metadataAlertTone(visual)}>
      <div>
        Latest image analysis status:
        {formatMetadataStatus(visual.statusLabel)}
        {formatMetadataAnalyzedAt(visual.updatedAt)}
        {formatMetadataModel(visual.modelId)}
        {formatMetadataJob(visual.jobId)}
      </div>
      <MetadataVisualFailure visual={visual} />
    </PipelineAlertBox>
  );
}

export function VisualAnalysisAlerts({
  busy,
  context,
}: {
  busy: boolean;
  context: SocialContext;
}): React.JSX.Element {
  const visual = buildVisualAnalysisAlertState(context);

  return (
    <>
      <StaleVisualAnalysisAlert busy={busy} visual={visual} />
      <ReadyVisualAnalysisAlert busy={busy} visual={visual} />
      <MetadataVisualAnalysisAlert busy={busy} visual={visual} />
    </>
  );
}
