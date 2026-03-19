'use client';

import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { KangurSocialManualPipelineProgress } from '@/shared/contracts/kangur-social-pipeline';
import { Button, FormSection } from '@/features/kangur/shared/ui';
import { cn } from '@/shared/utils';

export type SocialPostPipelineProps = {
  activePostId: string | null;
  pipelineStep:
    | 'idle'
    | 'loading_context'
    | 'capturing'
    | 'saving'
    | 'generating'
    | 'previewing'
    | 'done'
    | 'error';
  pipelineProgress: KangurSocialManualPipelineProgress | null;
  pipelineErrorMessage: string | null;
  handleRunFullPipeline: () => Promise<void>;
  handleRunFullPipelineWithFreshCapture: () => Promise<void>;
  handleCaptureImagesOnly: () => Promise<void>;
  canRunPipeline: boolean;
  canRunFreshCapturePipeline: boolean;
  canCaptureImagesOnly: boolean;
  pipelineBlockedReason: string | null;
  captureBlockedReason: string | null;
  captureOnlyPending: boolean;
  captureOnlyMessage: string | null;
  captureOnlyErrorMessage: string | null;
  batchCapturePresetCount: number;
  effectiveBatchCapturePresetCount: number;
  batchCapturePresetLimit: number | null;
};

export function SocialPostPipeline({
  activePostId,
  pipelineStep,
  pipelineProgress,
  pipelineErrorMessage,
  handleRunFullPipeline,
  handleRunFullPipelineWithFreshCapture,
  handleCaptureImagesOnly,
  canRunPipeline,
  canRunFreshCapturePipeline,
  canCaptureImagesOnly,
  pipelineBlockedReason,
  captureBlockedReason,
  captureOnlyPending,
  captureOnlyMessage,
  captureOnlyErrorMessage,
  batchCapturePresetCount,
  effectiveBatchCapturePresetCount,
  batchCapturePresetLimit,
}: SocialPostPipelineProps) {
  const isPipelineActive = pipelineStep !== 'idle' && pipelineStep !== 'done' && pipelineStep !== 'error';
  const isBusy = isPipelineActive || captureOnlyPending;
  const captureSummary =
    pipelineProgress?.captureMode === 'existing_assets'
      ? 'Using the visuals already attached to the draft. No new screenshots were captured.'
      : pipelineProgress?.addonsCreated == null
      ? null
      : pipelineProgress.addonsCreated > 0
        ? `Captured ${pipelineProgress.addonsCreated} screenshot${pipelineProgress.addonsCreated === 1 ? '' : 's'}${pipelineProgress.captureFailureCount ? `, ${pipelineProgress.captureFailureCount} failed` : ''}.`
        : 'No screenshots were captured.';
  const captureFailures = (pipelineProgress?.captureFailures ?? []).slice(0, 3);
  const captureLimitSummary =
    batchCapturePresetCount === 0
      ? 'No Playwright capture presets selected.'
      : batchCapturePresetLimit == null
        ? `Fresh capture will use all ${batchCapturePresetCount} selected presets.`
        : `Fresh capture will use up to ${effectiveBatchCapturePresetCount} of ${batchCapturePresetCount} selected presets.`;

  return (
    <FormSection
      title='Automation Pipeline'
      description='Run the server-side draft pipeline with existing visuals, or force a fresh Playwright capture first.'
      variant='subtle'
      className='p-4 border-primary/20 bg-primary/5'
    >
      <div className='mt-2 space-y-3'>
        <div className='flex flex-col gap-2 lg:flex-row lg:flex-wrap'>
          <Button
            type='button'
            size='sm'
            onClick={() => void handleRunFullPipeline()}
            disabled={!activePostId || isBusy || !canRunPipeline}
            className='gap-2 shadow-lg shadow-primary/20 lg:w-auto'
          >
            <Sparkles className={cn('h-4 w-4', isPipelineActive && 'animate-pulse')} />
            Run pipeline
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => void handleRunFullPipelineWithFreshCapture()}
            disabled={!activePostId || isBusy || !canRunFreshCapturePipeline}
            className='lg:w-auto'
          >
            Run pipeline + fresh capture
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => void handleCaptureImagesOnly()}
            disabled={!activePostId || isBusy || !canCaptureImagesOnly}
            className='lg:w-auto'
          >
            {captureOnlyPending ? 'Capturing images...' : 'Capture images only'}
          </Button>
        </div>
        <div className='rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-xs text-muted-foreground'>
          {captureLimitSummary}
        </div>
        <div className='grid gap-4 sm:grid-cols-5'>
          {[
            { id: 'loading_context', label: 'Load context' },
            { id: 'capturing', label: 'Capture screenshots' },
            { id: 'saving', label: 'Link images' },
            { id: 'generating', label: 'Generate draft' },
            { id: 'previewing', label: 'Prepare doc diff' },
          ].map((step, index) => {
            const steps = ['loading_context', 'capturing', 'saving', 'generating', 'previewing', 'done'];
            const currentIdx = steps.indexOf(pipelineStep);
            const stepIdx = steps.indexOf(step.id);
            const isCompleted = currentIdx > stepIdx || pipelineStep === 'done';
            const isActive = pipelineStep === step.id;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all',
                  isActive ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/40 bg-card/20',
                  isCompleted && 'border-emerald-500/40 bg-emerald-500/5'
                )}
              >
                <div className='relative'>
                  {isActive ? (
                    <Loader2 className='h-5 w-5 animate-spin text-primary' />
                  ) : isCompleted ? (
                    <CheckCircle2 className='h-5 w-5 text-emerald-500' />
                  ) : pipelineStep === 'error' && stepIdx === currentIdx ? (
                    <AlertCircle className='h-5 w-5 text-rose-500' />
                  ) : (
                    <div className='flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-bold text-muted-foreground'>
                      {index + 1}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    isActive ? 'text-primary' : isCompleted ? 'text-emerald-400' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
        {pipelineProgress?.message ? (
          <div className='rounded-xl border border-border/50 bg-background/70 px-3 py-2 text-xs text-foreground'>
            {pipelineProgress.message}
          </div>
        ) : null}
        {captureOnlyMessage ? (
          <div className='rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100'>
            {captureOnlyMessage}
          </div>
        ) : null}
        {captureSummary ? (
          <div className='rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-950 dark:text-sky-100'>
            {captureSummary}
          </div>
        ) : null}
        {pipelineStep === 'error' && pipelineErrorMessage ? (
          <div className='rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-900 dark:text-rose-200'>
            {pipelineErrorMessage}
          </div>
        ) : null}
        {captureOnlyErrorMessage ? (
          <div className='rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-900 dark:text-rose-200'>
            {captureOnlyErrorMessage}
          </div>
        ) : null}
        {captureFailures.length > 0 ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100'>
            <div className='font-semibold'>Capture issues</div>
            <ul className='mt-1 space-y-1'>
              {captureFailures.map((failure) => (
                <li key={`${failure.id}-${failure.reason}`}>
                  {failure.id}: {failure.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className='text-xs text-muted-foreground italic text-center'>
          Run pipeline reuses attached visuals. Run pipeline + fresh capture replaces the selected preset captures for this run.
        </p>
        {!canRunPipeline && pipelineBlockedReason ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200'>
            {pipelineBlockedReason}
          </div>
        ) : null}
        {!canRunFreshCapturePipeline && captureBlockedReason ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200'>
            {captureBlockedReason}
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}
