'use client';

/* eslint-disable complexity, max-lines-per-function -- Legacy alert aggregator with many independent UI states. */

import React from 'react';
import { LoadingState } from '@/shared/ui';
import { useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel } from './SocialJobStatusPill';

const hasText = (value: string | null | undefined): boolean => (value?.length ?? 0) > 0;

const resolveLatestVisualAnalysisError = ({
  liveError,
  hasFailedStatus,
  savedError,
}: {
  liveError: string;
  hasFailedStatus: boolean;
  savedError: string;
}): string => {
  if (liveError.length > 0) return liveError;
  if (hasFailedStatus) return savedError;
  return '';
};

/**
 * SocialPipelineAlerts component
 * Renders various conditional alerts and status messages for the social pipeline.
 */
export function SocialPipelineAlerts(): React.JSX.Element {
  const {
    activePostId,
    canGenerateSocialDraft,
    socialDraftBlockedReason,
    canRunVisualAnalysisPipeline,
    socialVisualAnalysisBlockedReason,
    hasBatchCaptureConfig,
    socialBatchCaptureBlockedReason,
    isSavedVisualAnalysisStale,
    hasSavedVisualAnalysis,
    pipelineStep,
    visualAnalysisResult,
    activePost,
    currentVisualAnalysisJob,
    programmableCaptureMessage,
    programmableCaptureErrorMessage,
    pipelineErrorMessage,
    captureOnlyPending,
    captureOnlyMessage,
    captureOnlyErrorMessage,
  } = useSocialPostContext();

  const hasActivePost = (activePostId?.length ?? 0) > 0;
  const canRunVisualAnalysis = hasActivePost && canRunVisualAnalysisPipeline;
  const isPipelineBusy =
    pipelineStep === 'loading_context' ||
    pipelineStep === 'capturing' ||
    pipelineStep === 'saving' ||
    pipelineStep === 'generating' ||
    pipelineStep === 'previewing';

  const readyVisualHighlightCount = visualAnalysisResult?.highlights.length ?? 0;
  const hasReadyVisualAnalysis =
    (visualAnalysisResult?.summary.trim().length ?? 0) > 0 || readyVisualHighlightCount > 0;
  const hasLiveVisualAnalysisJob = (currentVisualAnalysisJob?.status.length ?? 0) > 0;
  const shouldWarnSavedAnalysisStale =
    isSavedVisualAnalysisStale && hasSavedVisualAnalysis && !hasLiveVisualAnalysisJob;

  const savedVisualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const readyVisualAnalysisUpdatedAt = activePost?.visualAnalysisUpdatedAt ?? null;
  const readyVisualAnalysisModelId = activePost?.visualAnalysisModelId?.trim() ?? '';
  const savedVisualAnalysisJobId = activePost?.visualAnalysisJobId?.trim() ?? '';
  const savedVisualAnalysisError = activePost?.visualAnalysisError?.trim() ?? '';
  const latestVisualAnalysisJobStatus =
    currentVisualAnalysisJob?.status ?? savedVisualAnalysisStatus ?? null;
  const latestVisualAnalysisStatusLabel = getSocialJobStatusLabel(
    latestVisualAnalysisJobStatus
  );
  const latestVisualAnalysisJobId =
    currentVisualAnalysisJob?.id.trim() ?? savedVisualAnalysisJobId;
  const latestVisualAnalysisStatusKey =
    latestVisualAnalysisJobStatus?.trim().toLowerCase() ?? null;
  const hasFailedVisualAnalysisStatus = latestVisualAnalysisStatusKey === 'failed';
  const latestVisualAnalysisLiveError = currentVisualAnalysisJob?.failedReason?.trim() ?? '';
  const hasLatestVisualAnalysisMetadata = Boolean(
    hasText(latestVisualAnalysisStatusLabel) ||
      readyVisualAnalysisUpdatedAt !== null ||
      hasText(readyVisualAnalysisModelId) ||
      hasText(latestVisualAnalysisJobId)
  );
  const latestVisualAnalysisError = resolveLatestVisualAnalysisError({
    liveError: latestVisualAnalysisLiveError,
    hasFailedStatus: hasFailedVisualAnalysisStatus,
    savedError: savedVisualAnalysisError,
  });

  const editorStateTitlePl = activePost?.titlePl.trim() ?? '';
  const editorStateTitleEn = activePost?.titleEn.trim() ?? '';
  let activeDraftLabel = 'Untitled draft';
  if (editorStateTitlePl.length > 0) {
    activeDraftLabel = editorStateTitlePl;
  } else if (editorStateTitleEn.length > 0) {
    activeDraftLabel = editorStateTitleEn;
  }

  return (
    <>
      {!hasActivePost && (
        <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
          Create or select a draft before running the social pipeline.
        </div>
      )}

      {!canGenerateSocialDraft && (socialDraftBlockedReason?.length ?? 0) > 0 && (
        <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200'>
          {socialDraftBlockedReason}
        </div>
      )}

      {!canRunVisualAnalysis && hasActivePost && (socialVisualAnalysisBlockedReason?.length ?? 0) > 0 && (
        <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
          {socialVisualAnalysisBlockedReason}
        </div>
      )}

      {!hasBatchCaptureConfig && !canGenerateSocialDraft && (socialBatchCaptureBlockedReason?.length ?? 0) > 0 && (
        <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
          {socialBatchCaptureBlockedReason}
        </div>
      )}

      {shouldWarnSavedAnalysisStale && !isPipelineBusy && (
        <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200'>
          Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.
        </div>
      )}

      {hasReadyVisualAnalysis && !isPipelineBusy && (
        <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200'>
          Image analysis ready for this draft.
          {readyVisualHighlightCount > 0
            ? ` ${readyVisualHighlightCount} highlight${readyVisualHighlightCount === 1 ? '' : 's'}.`
            : ''}
          {' '}Open the modal to review it or start the post-generation pass.
          {(latestVisualAnalysisStatusLabel?.length ?? 0) > 0 ||
          readyVisualAnalysisUpdatedAt !== null ||
          readyVisualAnalysisModelId.length > 0 ||
          latestVisualAnalysisJobId.length > 0 ? (
            <div className='mt-1 text-[11px] text-emerald-950/80 dark:text-emerald-100/80'>
              {(latestVisualAnalysisStatusLabel?.length ?? 0) > 0
                ? `${(currentVisualAnalysisJob?.status.length ?? 0) > 0 ? 'Latest run' : 'Saved run'}: ${latestVisualAnalysisStatusLabel}. `
                : ''}
              {readyVisualAnalysisUpdatedAt !== null
                ? `Analyzed: ${new Date(readyVisualAnalysisUpdatedAt).toLocaleString()}. `
                : ''}
              {readyVisualAnalysisModelId.length > 0 ? `Model: ${readyVisualAnalysisModelId}. ` : ''}
              {latestVisualAnalysisJobId.length > 0 ? `Queue job: ${latestVisualAnalysisJobId}.` : ''}
            </div>
          ) : null}
          {latestVisualAnalysisError.length > 0 ? (
            <div className='mt-1 text-[11px] text-emerald-950/80 dark:text-emerald-100/80'>
              Latest failure: {latestVisualAnalysisError}
            </div>
          ) : null}
        </div>
      )}

      {!hasReadyVisualAnalysis && hasLatestVisualAnalysisMetadata && !isPipelineBusy && (
        <div
          className={
            hasFailedVisualAnalysisStatus
              ? 'rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'
              : 'rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'
          }
        >
          <div>
            Latest image analysis status:
            {(latestVisualAnalysisStatusLabel?.length ?? 0) > 0 ? ` ${latestVisualAnalysisStatusLabel}.` : ''}
            {readyVisualAnalysisUpdatedAt !== null
              ? ` Analyzed: ${new Date(readyVisualAnalysisUpdatedAt).toLocaleString()}.`
              : ''}
            {readyVisualAnalysisModelId.length > 0 ? ` Model: ${readyVisualAnalysisModelId}.` : ''}
            {latestVisualAnalysisJobId.length > 0 ? ` Queue job: ${latestVisualAnalysisJobId}.` : ''}
          </div>
          {latestVisualAnalysisError.length > 0 ? (
            <div className='mt-1'>Failure: {latestVisualAnalysisError}</div>
          ) : null}
        </div>
      )}

      {(programmableCaptureMessage?.length ?? 0) > 0 ? (
        <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-amber-200'>
          {programmableCaptureMessage}
        </div>
      ) : null}

      {(programmableCaptureErrorMessage?.length ?? 0) > 0 ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {programmableCaptureErrorMessage}
        </div>
      ) : null}

      {pipelineStep === 'error' && (pipelineErrorMessage?.length ?? 0) > 0 && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {pipelineErrorMessage}
        </div>
      )}

      {pipelineStep === 'done' && hasActivePost && (
        <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200'>
          Draft updated: {activeDraftLabel}. The editor opened with the generated content.
        </div>
      )}

      {captureOnlyPending && (
        <LoadingState
          message={hasText(captureOnlyMessage) ? captureOnlyMessage ?? 'Capturing...' : 'Capturing...'}
          size='xs'
        />
      )}

      {!captureOnlyPending && (captureOnlyMessage?.length ?? 0) > 0 && (
        <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200'>
          {captureOnlyMessage}
        </div>
      )}

      {(captureOnlyErrorMessage?.length ?? 0) > 0 && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {captureOnlyErrorMessage}
        </div>
      )}
    </>
  );
}
