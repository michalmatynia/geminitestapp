'use client';

import React from 'react';
import {
  Badge,
  Button,
  LoadingState,
} from '@/features/kangur/shared/ui';
import { KangurProgressBar } from '@/features/kangur/ui/design/primitives';
import { KangurAdminCard } from '../components/KangurAdminCard';
import { useSocialPostContext } from './SocialPostContext';
import {
  getSocialJobStatusLabel,
  SocialJobStatusPill,
} from './SocialJobStatusPill';
import type { PipelineStep } from './AdminKangurSocialPage.Constants';

const PIPELINE_PROGRESS_VALUE_BY_STEP = {
  loading_context: 18,
  capturing: 42,
  saving: 64,
  generating: 82,
  previewing: 96,
} as const;

export function SocialPostPipeline(): React.JSX.Element {
  const {
    activePost,
    activePostId,
    editorState,
    pipelineStep,
    pipelineProgress,
    pipelineErrorMessage,
    currentPipelineJob,
    currentVisualAnalysisJob,
    currentGenerationJob,
    visualAnalysisResult,
    hasSavedVisualAnalysis,
    isSavedVisualAnalysisStale,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    handleOpenVisualAnalysisModal,
    handleOpenProgrammablePlaywrightModal,
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
    captureOnlyMessage,
    captureOnlyErrorMessage,
    programmableCapturePending,
    programmableCaptureMessage,
    programmableCaptureErrorMessage,
    batchCapturePresetLimit,
    hasBatchCaptureConfig,
    setIsPostEditorModalOpen,
  } = useSocialPostContext();

  const hasActivePost = Boolean(activePostId);
  const canRunTextPipeline = hasActivePost && canGenerateSocialDraft;
  const canRunFreshCapture = hasActivePost && canRunFreshCapturePipeline;
  const canRunVisualAnalysis = hasActivePost && canRunVisualAnalysisPipeline;
  const canCaptureImagesOnly =
    hasActivePost &&
    Boolean((batchCaptureBaseUrl ?? '').trim()) &&
    batchCapturePresetIds.length > 0;
  const canOpenProgrammableCapture = hasActivePost;
  const batchCapturePresetCount = batchCapturePresetIds.length;
  const pipelineProgressValue = pipelineProgress
    ? PIPELINE_PROGRESS_VALUE_BY_STEP[pipelineProgress.step]
    : 0;
  const isPipelineBusy =
    pipelineStep === 'loading_context' ||
    pipelineStep === 'capturing' ||
    pipelineStep === 'saving' ||
    pipelineStep === 'generating' ||
    pipelineStep === 'previewing';
  const activeDraftLabel =
    editorState?.titlePl?.trim() || editorState?.titleEn?.trim() || 'Untitled draft';
  const previousPipelineStepRef = React.useRef<PipelineStep>('idle');
  const isFreshCaptureInProgress =
    pipelineStep === 'capturing' && pipelineProgress?.captureMode === 'fresh_capture';
  const captureCompletedCount = pipelineProgress?.captureCompletedCount ?? 0;
  const captureRemainingCount = pipelineProgress?.captureRemainingCount ?? 0;
  const captureTotalCount = pipelineProgress?.captureTotalCount ?? 0;
  const captureFailureCount = pipelineProgress?.captureFailureCount ?? 0;
  const readyVisualHighlightCount = visualAnalysisResult?.highlights?.length ?? 0;
  const savedVisualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const readyVisualAnalysisUpdatedAt = activePost?.visualAnalysisUpdatedAt ?? null;
  const readyVisualAnalysisModelId = activePost?.visualAnalysisModelId?.trim() ?? '';
  const savedVisualAnalysisJobId = activePost?.visualAnalysisJobId?.trim() ?? '';
  const latestVisualAnalysisJobStatus =
    currentVisualAnalysisJob?.status ?? savedVisualAnalysisStatus ?? null;
  const latestVisualAnalysisStatusLabel = getSocialJobStatusLabel(
    latestVisualAnalysisJobStatus
  );
  const latestVisualAnalysisJobId =
    currentVisualAnalysisJob?.id?.trim() ?? savedVisualAnalysisJobId;
  const latestVisualAnalysisStatusKey =
    latestVisualAnalysisJobStatus?.trim().toLowerCase() ?? null;
  const hasInFlightVisualAnalysisStatus =
    latestVisualAnalysisStatusKey === 'queued' ||
    latestVisualAnalysisStatusKey === 'waiting' ||
    latestVisualAnalysisStatusKey === 'running' ||
    latestVisualAnalysisStatusKey === 'active';
  const hasFailedVisualAnalysisStatus = latestVisualAnalysisStatusKey === 'failed';
  const hasLatestVisualAnalysisMetadata = Boolean(
    latestVisualAnalysisStatusLabel ||
      readyVisualAnalysisUpdatedAt ||
      readyVisualAnalysisModelId ||
      latestVisualAnalysisJobId
  );
  const hasLiveVisualAnalysisJob = Boolean(currentVisualAnalysisJob?.status);
  const hasReadyVisualAnalysis =
    Boolean(visualAnalysisResult?.summary.trim()) || readyVisualHighlightCount > 0;
  const shouldWarnSavedAnalysisStale =
    isSavedVisualAnalysisStale && hasSavedVisualAnalysis && !hasLiveVisualAnalysisJob;
  const shouldReviewVisualAnalysis =
    hasLiveVisualAnalysisJob ||
    (!isSavedVisualAnalysisStale && (hasReadyVisualAnalysis || hasLatestVisualAnalysisMetadata));
  const latestVisualAnalysisJobTitle = [
    currentVisualAnalysisJob?.progress?.message ?? null,
    currentVisualAnalysisJob?.failedReason ?? null,
    currentVisualAnalysisJob?.id
      ? `Queue job: ${currentVisualAnalysisJob.id}`
      : latestVisualAnalysisJobId
        ? `Queue job: ${latestVisualAnalysisJobId}`
        : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const latestPipelineJobTitle = [
    currentPipelineJob?.progress?.message ?? null,
    currentPipelineJob?.failedReason ?? null,
    currentPipelineJob?.id ? `Queue job: ${currentPipelineJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const latestGenerationJobTitle = [
    currentGenerationJob?.progress?.message ?? null,
    currentGenerationJob?.failedReason ?? null,
    currentGenerationJob?.id ? `Queue job: ${currentGenerationJob.id}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
  const textPipelineButtonTitle = !hasActivePost
    ? 'Create or select a draft before running the pipeline.'
    : !canGenerateSocialDraft
      ? socialDraftBlockedReason ?? 'Choose a Social post model first.'
      : isPipelineBusy
        ? 'Wait for the current pipeline run to finish.'
        : 'Generate a post from the current draft and selected visuals.';
  const visualAnalysisButtonTitle = !hasActivePost
    ? 'Create or select a draft before running image analysis.'
    : !canRunVisualAnalysis
      ? socialVisualAnalysisBlockedReason ??
        'Select at least one image add-on and configure a vision model first.'
      : isPipelineBusy
        ? 'Wait for the current pipeline run to finish.'
        : shouldWarnSavedAnalysisStale
          ? 'Saved image analysis exists for this draft, but the selected visuals changed. Rerun image analysis before generating.'
        : hasReadyVisualAnalysis
          ? 'Review the saved image analysis or start the separate Generate post with analysis step.'
        : hasFailedVisualAnalysisStatus
          ? 'Review the failed image-analysis run or rerun analysis from the modal.'
        : hasInFlightVisualAnalysisStatus
          ? 'Review the latest image-analysis run status or open the modal to wait for the saved result.'
        : hasLatestVisualAnalysisMetadata && !hasReadyVisualAnalysis
          ? 'Review the latest saved image-analysis run status or rerun analysis from the modal.'
        : 'Analyze the selected visuals first, then use Generate post with analysis as the follow-up AI pass.';
  const visualAnalysisButtonLabel = shouldReviewVisualAnalysis
    ? 'Review image analysis'
    : 'Image analysis';
  const freshCaptureButtonTitle = !hasActivePost
    ? 'Create or select a draft before running fresh capture.'
    : !canRunFreshCapture
      ? socialBatchCaptureBlockedReason ?? 'Configure fresh capture before using this flow.'
      : isPipelineBusy
        ? 'Wait for the current pipeline run to finish.'
        : 'Capture fresh screenshots first, then generate a post from them.';
  const captureImagesOnlyButtonTitle = !hasActivePost
    ? 'Create or select a draft before capturing images.'
    : !canCaptureImagesOnly
      ? socialBatchCaptureBlockedReason ?? 'Configure fresh capture before capturing images.'
      : captureOnlyPending || isPipelineBusy
        ? 'Wait for the current capture or pipeline run to finish.'
        : 'Capture screenshots and attach them to the active draft without generating copy.';
  const programmableCaptureButtonTitle = !hasActivePost
    ? 'Create or select a draft before opening programmable Playwright capture.'
    : programmableCapturePending || isPipelineBusy
      ? 'Wait for the current capture or pipeline run to finish.'
      : 'Choose a Playwright persona, edit the script, and define custom routes for fresh screenshots.';

  React.useEffect(() => {
    if (
      previousPipelineStepRef.current !== 'done' &&
      pipelineStep === 'done' &&
      hasActivePost
    ) {
      setIsPostEditorModalOpen(true);
    }
    previousPipelineStepRef.current = pipelineStep;
  }, [hasActivePost, pipelineStep, setIsPostEditorModalOpen]);

  return (
    <KangurAdminCard>
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-sm font-semibold text-foreground'>Social pipeline</div>
          <div className='flex items-center gap-2'>
            {isPipelineBusy && (
              <Badge variant='outline' className='animate-pulse'>
                {pipelineStep === 'capturing'
                  ? 'Capturing...'
                  : pipelineStep === 'loading_context'
                    ? 'Loading context...'
                    : 'Generating...'}
              </Badge>
            )}
          </div>
        </div>

        <div className='space-y-3'>
          {hasActivePost && (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              Active draft:{' '}
              <span className='font-semibold text-foreground/90'>{activeDraftLabel}</span>
            </div>
          )}

          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              size='sm'
              onClick={() => void handleRunFullPipeline()}
              disabled={!canRunTextPipeline || isPipelineBusy}
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
              disabled={!canRunFreshCapture || isPipelineBusy}
              title={freshCaptureButtonTitle}
            >
              Fresh capture & pipeline
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleOpenProgrammablePlaywrightModal}
              disabled={!canOpenProgrammableCapture || programmableCapturePending || isPipelineBusy}
              title={programmableCaptureButtonTitle}
            >
              Programmable Playwright
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => void handleCaptureImagesOnly()}
              disabled={!canCaptureImagesOnly || captureOnlyPending || isPipelineBusy}
              title={captureImagesOnlyButtonTitle}
            >
              Capture images only
            </Button>
          </div>

          {(latestVisualAnalysisJobStatus ||
            currentPipelineJob?.status ||
            currentGenerationJob?.status) && (
            <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              <span className='font-medium text-foreground/80'>Runtime jobs:</span>
              {latestVisualAnalysisJobStatus ? (
                <SocialJobStatusPill
                  status={latestVisualAnalysisJobStatus}
                  label='Image analysis'
                  title={latestVisualAnalysisJobTitle || undefined}
                  className='text-[10px]'
                />
              ) : null}
              {currentGenerationJob?.status ? (
                <SocialJobStatusPill
                  status={currentGenerationJob.status}
                  label='Generate post'
                  title={latestGenerationJobTitle || undefined}
                  className='text-[10px]'
                />
              ) : null}
              {currentPipelineJob?.status ? (
                <SocialJobStatusPill
                  status={currentPipelineJob.status}
                  label='Full pipeline'
                  title={latestPipelineJobTitle || undefined}
                  className='text-[10px]'
                />
              ) : null}
            </div>
          )}

          {!hasActivePost && (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              Create or select a draft before running the social pipeline.
            </div>
          )}

          {!canGenerateSocialDraft && socialDraftBlockedReason && (
            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200'>
              {socialDraftBlockedReason}
            </div>
          )}

          {!canRunVisualAnalysis && hasActivePost && socialVisualAnalysisBlockedReason && (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              {socialVisualAnalysisBlockedReason}
            </div>
          )}

          {!hasBatchCaptureConfig && !canGenerateSocialDraft && socialBatchCaptureBlockedReason && (
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
              {latestVisualAnalysisStatusLabel ||
              readyVisualAnalysisModelId ||
              latestVisualAnalysisJobId ? (
                <div className='mt-1 text-[11px] text-emerald-950/80 dark:text-emerald-100/80'>
                  {latestVisualAnalysisStatusLabel
                    ? `${currentVisualAnalysisJob?.status ? 'Latest run' : 'Saved run'}: ${latestVisualAnalysisStatusLabel}. `
                    : ''}
                  {readyVisualAnalysisUpdatedAt
                    ? `Analyzed: ${new Date(readyVisualAnalysisUpdatedAt).toLocaleString()}. `
                    : ''}
                  {readyVisualAnalysisModelId ? `Model: ${readyVisualAnalysisModelId}. ` : ''}
                  {latestVisualAnalysisJobId ? `Queue job: ${latestVisualAnalysisJobId}.` : ''}
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
              Latest image analysis status:
              {latestVisualAnalysisStatusLabel ? ` ${latestVisualAnalysisStatusLabel}.` : ''}
              {readyVisualAnalysisUpdatedAt
                ? ` Analyzed: ${new Date(readyVisualAnalysisUpdatedAt).toLocaleString()}.`
                : ''}
              {readyVisualAnalysisModelId ? ` Model: ${readyVisualAnalysisModelId}.` : ''}
              {latestVisualAnalysisJobId ? ` Queue job: ${latestVisualAnalysisJobId}.` : ''}
            </div>
          )}

          {programmableCaptureMessage ? (
            <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200'>
              {programmableCaptureMessage}
            </div>
          ) : null}

          {programmableCaptureErrorMessage ? (
            <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {programmableCaptureErrorMessage}
            </div>
          ) : null}

          {isPipelineBusy && (
            <div className='space-y-2'>
              <KangurProgressBar accent='slate' value={pipelineProgressValue} size='sm' />
              <div className='text-center text-[10px] uppercase tracking-wider text-muted-foreground'>
                {Math.round(pipelineProgressValue)}% complete
              </div>
            </div>
          )}

          {isPipelineBusy && pipelineProgress?.message && (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              {pipelineProgress.message}
            </div>
          )}

          {isFreshCaptureInProgress && captureTotalCount > 0 && (
            <div className='grid grid-cols-3 gap-2 text-xs'>
              <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                  Captured
                </div>
                <div className='mt-1 font-semibold text-foreground'>
                  {captureCompletedCount}
                </div>
              </div>
              <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                  Left
                </div>
                <div className='mt-1 font-semibold text-foreground'>
                  {captureRemainingCount}
                </div>
              </div>
              <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                  Total
                </div>
                <div className='mt-1 font-semibold text-foreground'>
                  {captureTotalCount}
                  {captureFailureCount > 0 ? (
                    <span className='ml-2 text-[10px] font-medium text-destructive'>
                      {captureFailureCount} failed
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {pipelineStep === 'error' && pipelineErrorMessage && (
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
            <LoadingState message={captureOnlyMessage || 'Capturing...'} size='xs' />
          )}

          {!captureOnlyPending && captureOnlyMessage && (
            <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200'>
              {captureOnlyMessage}
            </div>
          )}

          {captureOnlyErrorMessage && (
            <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {captureOnlyErrorMessage}
            </div>
          )}

          <div className='rounded-xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground'>
            <div className='font-medium text-foreground/80 mb-1 uppercase tracking-tight text-[10px]'>Pipeline info</div>
            {isFreshCaptureInProgress && captureTotalCount > 0 && (
              <div className='mb-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-foreground/90'>
                Live Playwright capture: {captureCompletedCount} captured, {captureRemainingCount} left.
                {captureFailureCount > 0 ? ` ${captureFailureCount} failed.` : ''}
              </div>
            )}
            <ul className='list-inside list-disc space-y-1'>
              <li>
                Full pipeline: Load context → Generate PL/EN draft → Attach screenshots.
              </li>
              <li>
                Fresh capture: Triggers Playwright batch capture ({batchCapturePresetCount} presets, limit: {batchCapturePresetLimit || 'none'}) before generation.
              </li>
              <li>
                Capture only: Updates screenshots for the active draft without re-generating text.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </KangurAdminCard>
  );
}
