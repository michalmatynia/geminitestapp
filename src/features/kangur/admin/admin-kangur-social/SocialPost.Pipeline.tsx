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
  } = useSocialPostContext();

  const canCaptureImagesOnly =
    Boolean(activePostId) &&
    Boolean((batchCaptureBaseUrl ?? '').trim()) &&
    batchCapturePresetIds.length > 0;
  const batchCapturePresetCount = batchCapturePresetIds.length;
  const pipelineProgressValue = pipelineProgress
    ? PIPELINE_PROGRESS_VALUE_BY_STEP[pipelineProgress.step]
    : 0;

  return (
    <KangurAdminCard>
      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-sm font-semibold text-foreground'>Social pipeline</div>
          <div className='flex items-center gap-2'>
            {pipelineStep !== 'idle' && pipelineStep !== 'done' && pipelineStep !== 'error' && (
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
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              size='sm'
              onClick={() => void handleRunFullPipeline()}
              disabled={!canGenerateSocialDraft || pipelineStep !== 'idle'}
            >
              Run full pipeline
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void handleRunFullPipelineWithFreshCapture()}
              disabled={!canRunFreshCapturePipeline || pipelineStep !== 'idle'}
            >
              Fresh capture & pipeline
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => void handleCaptureImagesOnly()}
              disabled={!canCaptureImagesOnly || captureOnlyPending || pipelineStep !== 'idle'}
            >
              Capture images only
            </Button>
          </div>

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

          {pipelineStep !== 'idle' && pipelineStep !== 'done' && (
            <div className='space-y-2'>
              <KangurProgressBar accent='slate' value={pipelineProgressValue} size='sm' />
              <div className='text-center text-[10px] uppercase tracking-wider text-muted-foreground'>
                {Math.round(pipelineProgressValue)}% complete
              </div>
            </div>
          )}

          {pipelineStep === 'error' && pipelineErrorMessage && (
            <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {pipelineErrorMessage}
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
