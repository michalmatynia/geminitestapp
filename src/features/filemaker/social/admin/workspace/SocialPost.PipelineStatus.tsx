'use client';

import React from 'react';
import { KangurProgressBar } from '@/features/kangur/ui/design/primitives';
import { useSocialPostContext } from './SocialPostContext';
import { SocialJobStatusPill } from './SocialJobStatusPill';

/**
 * SocialJobStatusSection component
 * Displays pills for currently active or saved social runtime jobs.
 */
export function SocialJobStatusSection(): React.JSX.Element | null {
  const {
    currentVisualAnalysisJob,
    currentGenerationJob,
    currentPipelineJob,
    activePost,
  } = useSocialPostContext();

  const savedVisualAnalysisStatus = activePost?.visualAnalysisStatus ?? null;
  const savedVisualAnalysisJobId = activePost?.visualAnalysisJobId?.trim() ?? '';
  const savedVisualAnalysisError = activePost?.visualAnalysisError?.trim() ?? '';
  const latestVisualAnalysisJobStatus =
    currentVisualAnalysisJob?.status ?? savedVisualAnalysisStatus ?? null;

  const latestVisualAnalysisStatusKey =
    latestVisualAnalysisJobStatus?.trim().toLowerCase() ?? null;
  const hasFailedVisualAnalysisStatus = latestVisualAnalysisStatusKey === 'failed';

  const latestVisualAnalysisJobId =
    currentVisualAnalysisJob?.id?.trim() ?? savedVisualAnalysisJobId;

  if (latestVisualAnalysisJobStatus === null && 
      (currentGenerationJob?.status?.length ?? 0) === 0 && 
      (currentPipelineJob?.status?.length ?? 0) === 0) {
    return null;
  }

  const latestVisualAnalysisJobTitle = [
    currentVisualAnalysisJob?.progress?.message ?? null,
    currentVisualAnalysisJob?.failedReason ?? null,
    hasFailedVisualAnalysisStatus && (currentVisualAnalysisJob?.failedReason?.length ?? 0) === 0
      ? savedVisualAnalysisError
      : null,
    (currentVisualAnalysisJob?.id?.length ?? 0) > 0
      ? `Queue job: ${currentVisualAnalysisJob?.id}`
      : (latestVisualAnalysisJobId?.length ?? 0) > 0
        ? `Queue job: ${latestVisualAnalysisJobId}`
        : null,
  ]
    .filter((value): value is string => (value?.length ?? 0) > 0)
    .join(' · ');

  const latestPipelineJobTitle = [
    currentPipelineJob?.progress?.message ?? null,
    currentPipelineJob?.failedReason ?? null,
    (currentPipelineJob?.id?.length ?? 0) > 0 ? `Queue job: ${currentPipelineJob?.id}` : null,
  ]
    .filter((value): value is string => (value?.length ?? 0) > 0)
    .join(' · ');

  const latestGenerationJobTitle = [
    currentGenerationJob?.progress?.message ?? null,
    currentGenerationJob?.failedReason ?? null,
    (currentGenerationJob?.id?.length ?? 0) > 0 ? `Queue job: ${currentGenerationJob?.id}` : null,
  ]
    .filter((value): value is string => (value?.length ?? 0) > 0)
    .join(' · ');

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
      <span className='font-medium text-foreground/80'>Runtime jobs:</span>
      {latestVisualAnalysisJobStatus !== null ? (
        <SocialJobStatusPill
          status={latestVisualAnalysisJobStatus}
          label='Image analysis'
          title={latestVisualAnalysisJobTitle.length > 0 ? latestVisualAnalysisJobTitle : undefined}
          className='text-[10px]'
        />
      ) : null}
      {(currentGenerationJob?.status?.length ?? 0) > 0 ? (
        <SocialJobStatusPill
          status={currentGenerationJob!.status}
          label='Generate post'
          title={latestGenerationJobTitle.length > 0 ? latestGenerationJobTitle : undefined}
          className='text-[10px]'
        />
      ) : null}
      {(currentPipelineJob?.status?.length ?? 0) > 0 ? (
        <SocialJobStatusPill
          status={currentPipelineJob!.status}
          label='Full pipeline'
          title={latestPipelineJobTitle.length > 0 ? latestPipelineJobTitle : undefined}
          className='text-[10px]'
        />
      ) : null}
    </div>
  );
}

/**
 * SocialCaptureProgressSection component
 * Displays progress metrics for fresh or standalone Playwright captures.
 */
export function SocialCaptureProgressSection(): React.JSX.Element | null {
  const {
    pipelineStep,
    pipelineProgress,
    captureOnlyPending,
    captureOnlyBatchCaptureJob,
    programmableCapturePending,
    programmableCaptureBatchCaptureJob,
  } = useSocialPostContext();

  const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
    const normalized = status?.trim().toLowerCase();
    if (normalized === undefined || normalized === null || normalized.length === 0) return false;
    return normalized !== 'completed' && normalized !== 'failed';
  };

  const isFreshCaptureInProgress =
    pipelineStep === 'capturing' && pipelineProgress?.captureMode === 'fresh_capture';
  
  const getStandaloneJob = () => {
    if (captureOnlyPending && captureOnlyBatchCaptureJob !== null && isSocialRuntimeJobInFlight(captureOnlyBatchCaptureJob?.status)) {
      return captureOnlyBatchCaptureJob;
    }
    if (programmableCapturePending && programmableCaptureBatchCaptureJob !== null && isSocialRuntimeJobInFlight(programmableCaptureBatchCaptureJob?.status)) {
      return programmableCaptureBatchCaptureJob;
    }
    return null;
  };

  const standaloneJob = getStandaloneJob();
  const isStandaloneInProgress = standaloneJob !== null && (standaloneJob.progress?.totalCount ?? 0) > 0;

  if (!isFreshCaptureInProgress && !isStandaloneInProgress) return null;

  const data = isFreshCaptureInProgress
    ? {
        completed: pipelineProgress?.captureCompletedCount ?? 0,
        remaining: pipelineProgress?.captureRemainingCount ?? 0,
        total: pipelineProgress?.captureTotalCount ?? 0,
        failure: pipelineProgress?.captureFailureCount ?? 0,
      }
    : {
        completed: standaloneJob?.progress?.completedCount ?? 0,
        remaining: standaloneJob?.progress?.remainingCount ?? 0,
        total: standaloneJob?.progress?.totalCount ?? 0,
        failure: standaloneJob?.progress?.failureCount ?? 0,
      };

  if (data.total <= 0) return null;

  return (
    <div className='grid grid-cols-3 gap-2 text-xs'>
      <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
        <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>Captured</div>
        <div className='mt-1 font-semibold text-foreground'>{data.completed}</div>
      </div>
      <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
        <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>Left</div>
        <div className='mt-1 font-semibold text-foreground'>{data.remaining}</div>
      </div>
      <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
        <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>Total</div>
        <div className='mt-1 font-semibold text-foreground'>
          {data.total}
          {data.failure > 0 ? (
            <span className='ml-2 text-[10px] font-medium text-destructive'>{data.failure} failed</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const PIPELINE_PROGRESS_VALUE_BY_STEP = {
  loading_context: 18,
  capturing: 42,
  saving: 64,
  generating: 82,
  previewing: 96,
} as const;

/**
 * SocialPipelineProgress component
 * Renders the main pipeline progress bar and status message.
 */
export function SocialPipelineProgress(): React.JSX.Element | null {
  const { pipelineStep, pipelineProgress } = useSocialPostContext();
  
  const isPipelineBusy =
    pipelineStep === 'loading_context' ||
    pipelineStep === 'capturing' ||
    pipelineStep === 'saving' ||
    pipelineStep === 'generating' ||
    pipelineStep === 'previewing';

  if (!isPipelineBusy) return null;

  const step = pipelineProgress?.step;
  const pipelineProgressValue = (step !== undefined && step !== null) ? PIPELINE_PROGRESS_VALUE_BY_STEP[step] : 0;

  return (
    <div className='space-y-3'>
      <div className='space-y-2'>
        <KangurProgressBar accent='slate' value={pipelineProgressValue} size='sm' />
        <div className='text-center text-[10px] uppercase tracking-wider text-muted-foreground'>
          {Math.round(pipelineProgressValue)}% complete
        </div>
      </div>

      {(pipelineProgress?.message?.length ?? 0) > 0 && (
        <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
          {pipelineProgress?.message}
        </div>
      )}
    </div>
  );
}
