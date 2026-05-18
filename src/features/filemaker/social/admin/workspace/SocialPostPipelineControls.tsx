import React from 'react';
import { Badge, Button } from '@/shared/ui';

export type SocialPostPipelineControlsProps = {
  isPipelineBusy: boolean;
  pipelineStep: string | null;
  hasActivePost: boolean;
  activeDraftLabel: string;
  canRunTextPipeline: boolean;
  hasBlockingRuntimeJob: boolean;
  textPipelineButtonTitle: string;
  shouldReviewVisualAnalysis: boolean;
  canRunVisualAnalysis: boolean;
  visualAnalysisButtonLabel: string;
  visualAnalysisButtonTitle: string;
  canRunFreshCapture: boolean;
  freshCaptureButtonTitle: string;
  canCaptureImagesOnly: boolean;
  captureOnlyPending: boolean;
  captureImagesOnlyButtonTitle: string;
  handleRunFullPipeline: () => void | Promise<void>;
  handleOpenVisualAnalysisModal: () => void;
  handleRunFullPipelineWithFreshCapture: () => void | Promise<void>;
  handleCaptureImagesOnly: () => void | Promise<void>;
};

export const SocialPostPipelineControls: React.FC<SocialPostPipelineControlsProps> = ({
  isPipelineBusy,
  pipelineStep,
  hasActivePost,
  activeDraftLabel,
  canRunTextPipeline,
  hasBlockingRuntimeJob,
  textPipelineButtonTitle,
  shouldReviewVisualAnalysis,
  canRunVisualAnalysis,
  visualAnalysisButtonLabel,
  visualAnalysisButtonTitle,
  canRunFreshCapture,
  freshCaptureButtonTitle,
  canCaptureImagesOnly,
  captureOnlyPending,
  captureImagesOnlyButtonTitle,
  handleRunFullPipeline,
  handleOpenVisualAnalysisModal,
  handleRunFullPipelineWithFreshCapture,
  handleCaptureImagesOnly,
}) => {
  return (
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
            variant='outline'
            size='sm'
            onClick={() => void handleCaptureImagesOnly()}
            disabled={!canCaptureImagesOnly || captureOnlyPending || isPipelineBusy || hasBlockingRuntimeJob}
            title={captureImagesOnlyButtonTitle}
          >
            Capture images only
          </Button>
        </div>
      </div>
    </div>
  );
};
