'use client';

import React from 'react';
import { Button } from '@/shared/ui';
import { useSocialPostContext } from './SocialPostContext';
import { getSocialJobStatusLabel } from './SocialJobStatusPill';

/**
 * SocialPipelineActions component
 * Renders the primary action buttons for the social pipeline.
 */
export function SocialPipelineActions(): React.JSX.Element {
  const {
    activePostId,
    pipelineStep,
    currentPipelineJob,
    currentVisualAnalysisJob,
    currentGenerationJob,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    handleOpenVisualAnalysisModal,
    handleCaptureImagesOnly,
    canGenerateSocialDraft,
    canRunVisualAnalysisPipeline,
    canRunFreshCapturePipeline,
    batchCaptureBaseUrl,
    batchCapturePresetIds,
    socialDraftBlockedReason,
    socialBatchCaptureBlockedReason,
    socialVisualAnalysisBlockedReason,
    captureOnlyPending,
    visualAnalysisResult,
    isSavedVisualAnalysisStale,
    hasSavedVisualAnalysis,
    activePost,
  } = useSocialPostContext();

  const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
    const normalized = status?.trim().toLowerCase();
    if (normalized === undefined || normalized === null || normalized.length === 0) return false;
    return normalized !== 'completed' && normalized !== 'failed';
  };

  const hasActivePost = activePostId !== null && activePostId !== undefined && activePostId.length > 0;
  const isPipelineBusy =
    pipelineStep === 'loading_context' ||
    pipelineStep === 'capturing' ||
    pipelineStep === 'saving' ||
    pipelineStep === 'generating' ||
    pipelineStep === 'previewing';
  
  const hasBlockingRuntimeJob =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);

  const canRunTextPipeline = hasActivePost && canGenerateSocialDraft;
  const canRunFreshCapture = hasActivePost && canRunFreshCapturePipeline;
  const canRunVisualAnalysis = hasActivePost && canRunVisualAnalysisPipeline;
  const canCaptureImagesOnly =
    hasActivePost &&
    (batchCaptureBaseUrl ?? '').trim().length > 0 &&
    batchCapturePresetIds.length > 0;

  const textPipelineButtonTitle = React.useMemo(() => {
    if (!hasActivePost) return 'Create or select a draft before running the pipeline.';
    if (!canGenerateSocialDraft) return socialDraftBlockedReason ?? 'Choose a Social post model first.';
    if (isPipelineBusy || hasBlockingRuntimeJob) return 'Wait for the current Social runtime job to finish.';
    return 'Generate a post from the current draft and selected visuals.';
  }, [hasActivePost, canGenerateSocialDraft, socialDraftBlockedReason, isPipelineBusy, hasBlockingRuntimeJob]);

  const readyVisualHighlightCount = visualAnalysisResult?.highlights?.length ?? 0;
  const hasReadyVisualAnalysis =
    (visualAnalysisResult?.summary.trim().length ?? 0) > 0 || readyVisualHighlightCount > 0;
  const hasLiveVisualAnalysisJob = (currentVisualAnalysisJob?.status?.length ?? 0) > 0;
  const shouldWarnSavedAnalysisStale =
    isSavedVisualAnalysisStale && hasSavedVisualAnalysis && !hasLiveVisualAnalysisJob;
  
  const savedVisualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const latestVisualAnalysisJobStatus =
    currentVisualAnalysisJob?.status ?? savedVisualAnalysisStatus ?? null;
  const latestVisualAnalysisStatusKey =
    latestVisualAnalysisJobStatus?.trim().toLowerCase() ?? null;
  const hasInFlightVisualAnalysisStatus =
    latestVisualAnalysisStatusKey === 'queued' ||
    latestVisualAnalysisStatusKey === 'waiting' ||
    latestVisualAnalysisStatusKey === 'running' ||
    latestVisualAnalysisStatusKey === 'active';
  const hasFailedVisualAnalysisStatus = latestVisualAnalysisStatusKey === 'failed';
  const hasLatestVisualAnalysisMetadata = Boolean(
    getSocialJobStatusLabel(latestVisualAnalysisJobStatus) ||
      activePost?.visualAnalysisUpdatedAt ||
      (activePost?.visualAnalysisModelId?.trim().length ?? 0) > 0 ||
      (activePost?.visualAnalysisJobId?.trim().length ?? 0) > 0
  );

  const visualAnalysisButtonTitle = React.useMemo(() => {
    if (!hasActivePost) return 'Create or select a draft before running image analysis.';
    if (!canRunVisualAnalysis) return socialVisualAnalysisBlockedReason ?? 'Select at least one image add-on and configure a vision model first.';
    if (isPipelineBusy) return 'Wait for the current pipeline run to finish.';
    if (shouldWarnSavedAnalysisStale) return 'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.';
    if (hasReadyVisualAnalysis) return 'Review the saved image analysis or start the separate Generate post with analysis step.';
    if (hasFailedVisualAnalysisStatus) return 'Review the failed image-analysis run or rerun analysis from the modal.';
    if (hasInFlightVisualAnalysisStatus) return 'Review the latest image-analysis run status or open the modal to wait for the saved result.';
    if (hasLatestVisualAnalysisMetadata && !hasReadyVisualAnalysis) return 'Review the latest saved image-analysis run status or rerun analysis from the modal.';
    return 'Analyze the selected visuals first, then use Generate post with analysis as the follow-up AI pass.';
  }, [hasActivePost, canRunVisualAnalysis, socialVisualAnalysisBlockedReason, isPipelineBusy, shouldWarnSavedAnalysisStale, hasReadyVisualAnalysis, hasFailedVisualAnalysisStatus, hasInFlightVisualAnalysisStatus, hasLatestVisualAnalysisMetadata]);

  const shouldReviewVisualAnalysis =
    hasLiveVisualAnalysisJob ||
    (!isSavedVisualAnalysisStale && (hasReadyVisualAnalysis || hasLatestVisualAnalysisMetadata));

  const visualAnalysisButtonLabel = shouldReviewVisualAnalysis
    ? 'Review image analysis'
    : 'Image analysis';

  const freshCaptureButtonTitle = React.useMemo(() => {
    if (!hasActivePost) return 'Create or select a draft before running fresh capture.';
    if (!canRunFreshCapture) return socialBatchCaptureBlockedReason ?? 'Configure fresh capture before using this flow.';
    if (isPipelineBusy || hasBlockingRuntimeJob) return 'Wait for the current Social runtime job to finish.';
    return 'Capture fresh screenshots first, then generate a post from them.';
  }, [hasActivePost, canRunFreshCapture, socialBatchCaptureBlockedReason, isPipelineBusy, hasBlockingRuntimeJob]);

  const captureImagesOnlyButtonTitle = React.useMemo(() => {
    if (!hasActivePost) return 'Create or select a draft before capturing images.';
    if (!canCaptureImagesOnly) return socialBatchCaptureBlockedReason ?? 'Configure fresh capture before capturing images.';
    if (captureOnlyPending || isPipelineBusy || hasBlockingRuntimeJob) return 'Wait for the current Social runtime job to finish.';
    return 'Capture screenshots and attach them to the active draft without generating copy.';
  }, [hasActivePost, canCaptureImagesOnly, socialBatchCaptureBlockedReason, captureOnlyPending, isPipelineBusy, hasBlockingRuntimeJob]);

  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        size='sm'
        onClick={() => void handleRunFullPipeline()}
        disabled={!canRunTextPipeline || isPipelineBusy || hasBlockingRuntimeJob}
        title={textPipelineButtonTitle}
      >
        Run full pipeline
      </Button>
      <Button
        type='button'
        variant={shouldReviewVisualAnalysis ? 'secondary' : 'outline'}
        size='sm'
        onClick={handleOpenVisualAnalysisModal}
        disabled={!canRunVisualAnalysis || isPipelineBusy}
        title={visualAnalysisButtonTitle}
      >
        {visualAnalysisButtonLabel}
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => void handleRunFullPipelineWithFreshCapture()}
        disabled={!canRunFreshCapture || isPipelineBusy || hasBlockingRuntimeJob}
        title={freshCaptureButtonTitle}
      >
        Fresh capture & pipeline
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => void handleCaptureImagesOnly()}
        disabled={
          !canCaptureImagesOnly ||
          captureOnlyPending ||
          isPipelineBusy ||
          hasBlockingRuntimeJob
        }
        title={captureImagesOnlyButtonTitle}
      >
        Capture images only
      </Button>
    </div>
  );
}
