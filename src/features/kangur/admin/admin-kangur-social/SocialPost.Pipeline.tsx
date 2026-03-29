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
    activePostId,
    editorState,
    pipelineStep,
    pipelineProgress,
    pipelineErrorMessage,
    handleRunFullPipeline,
    handleRunFullPipelineWithFreshCapture,
    handleCaptureImagesOnly,
    canGenerateSocialDraft,
    canRunFreshCapturePipeline,
    batchCaptureBaseUrl,
    batchCapturePresetIds,
    socialDraftBlockedReason,
    socialBatchCaptureBlockedReason,
    captureOnlyPending,
    captureOnlyMessage,
    captureOnlyErrorMessage,
    batchCapturePresetLimit,
    hasBatchCaptureConfig,
    setIsPostEditorModalOpen,
  } = useSocialPostContext();

  const hasActivePost = Boolean(activePostId);
  const canRunTextPipeline = hasActivePost && canGenerateSocialDraft;
  const canRunFreshCapture = hasActivePost && canRunFreshCapturePipeline;
  const canCaptureImagesOnly =
    hasActivePost &&
    Boolean((batchCaptureBaseUrl ?? '').trim()) &&
    batchCapturePresetIds.length > 0;
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
            >
              Run full pipeline
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void handleRunFullPipelineWithFreshCapture()}
              disabled={!canRunFreshCapture || isPipelineBusy}
            >
              Fresh capture & pipeline
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => void handleCaptureImagesOnly()}
              disabled={!canCaptureImagesOnly || captureOnlyPending || isPipelineBusy}
            >
              Capture images only
            </Button>
          </div>

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

          {!hasBatchCaptureConfig && !canGenerateSocialDraft && socialBatchCaptureBlockedReason && (
            <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
              {socialBatchCaptureBlockedReason}
            </div>
          )}

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
