'use client';

import React from 'react';

import { KangurProgressBar } from '@/features/kangur/ui/design/primitives';
import { useSocialPostContext } from './SocialPostContext';
import { SocialJobStatusPill } from './SocialJobStatusPill';
import type { PipelineStep } from './SocialPublishingPage.Constants';

type SocialContext = ReturnType<typeof useSocialPostContext>;
type CaptureJob = NonNullable<SocialContext['captureOnlyBatchCaptureJob']>;

type JobPill = {
  key: string;
  label: string;
  status: string;
  title?: string;
};

type CaptureStats = {
  completed: number;
  remaining: number;
  total: number;
  failed: number;
};

const PIPELINE_PROGRESS_VALUE_BY_STEP = {
  loading_context: 18,
  capturing: 42,
  saving: 64,
  generating: 82,
  previewing: 96,
} as const satisfies Partial<Record<PipelineStep, number>>;

const BUSY_PIPELINE_STEPS = new Set<PipelineStep>([
  'loading_context',
  'capturing',
  'saving',
  'generating',
  'previewing',
]);

const hasText = (value: string | null | undefined): boolean =>
  (value?.length ?? 0) > 0;

const numberOrZero = (value: number | null | undefined): number => value ?? 0;

const isRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase() ?? '';
  return normalized.length > 0 && normalized !== 'completed' && normalized !== 'failed';
};

const hasCaptureJob = (job: CaptureJob | null | undefined): job is CaptureJob =>
  job !== null && job !== undefined;

const formatTitle = (parts: Array<string | null | undefined>): string | undefined => {
  const title = parts.filter((value): value is string => hasText(value)).join(' · ');
  return title.length > 0 ? title : undefined;
};

const latestVisualAnalysisStatus = (context: SocialContext): string | null =>
  context.currentVisualAnalysisJob?.status ??
  context.activePost?.visualAnalysisStatus ??
  null;

const latestVisualAnalysisJobId = (context: SocialContext): string => {
  const liveJobId = context.currentVisualAnalysisJob?.id.trim() ?? '';
  if (liveJobId.length > 0) return liveJobId;
  return context.activePost?.visualAnalysisJobId?.trim() ?? '';
};

const fallbackVisualAnalysisError = (
  context: SocialContext,
  failedReason: string,
  status: string
): string | null => {
  if (status.trim().toLowerCase() !== 'failed') return null;
  if (failedReason.length > 0) return null;
  return context.activePost?.visualAnalysisError?.trim() ?? '';
};

const visualAnalysisTitle = (context: SocialContext, status: string): string | undefined => {
  const failedReason = context.currentVisualAnalysisJob?.failedReason?.trim() ?? '';
  const jobId = latestVisualAnalysisJobId(context);
  return formatTitle([
    context.currentVisualAnalysisJob?.progress?.message ?? null,
    failedReason,
    fallbackVisualAnalysisError(context, failedReason, status),
    jobId.length > 0 ? `Queue job: ${jobId}` : null,
  ]);
};

const buildVisualJobPill = (context: SocialContext): JobPill | null => {
  const status = latestVisualAnalysisStatus(context);
  if (status === null) return null;

  return {
    key: 'visual-analysis',
    label: 'Image analysis',
    status,
    title: visualAnalysisTitle(context, status),
  };
};

const buildRuntimeJobPills = (context: SocialContext): JobPill[] =>
  [
    buildVisualJobPill(context),
    buildQueueJobPill('generation', 'Generate post', context.currentGenerationJob),
    buildQueueJobPill('pipeline', 'Full pipeline', context.currentPipelineJob),
  ].filter((pill): pill is JobPill => pill !== null);

const buildQueueJobPill = (
  key: string,
  label: string,
  job: SocialContext['currentGenerationJob'] | SocialContext['currentPipelineJob'] | undefined
): JobPill | null => {
  if (job === null || job === undefined) return null;

  const status = job.status;
  if (status.length === 0) return null;

  return {
    key,
    label,
    status,
    title: formatTitle([
      job.progress?.message ?? null,
      job.failedReason ?? null,
      job.id.length > 0 ? `Queue job: ${job.id}` : null,
    ]),
  };
};

const pipelineProgressValue = (step: PipelineStep): number =>
  step in PIPELINE_PROGRESS_VALUE_BY_STEP
    ? PIPELINE_PROGRESS_VALUE_BY_STEP[step as keyof typeof PIPELINE_PROGRESS_VALUE_BY_STEP]
    : 0;

const selectStandaloneCaptureJob = (context: SocialContext): CaptureJob | null => {
  const captureOnlyJob = context.captureOnlyBatchCaptureJob;
  if (
    context.captureOnlyPending &&
    hasCaptureJob(captureOnlyJob) &&
    isRuntimeJobInFlight(captureOnlyJob.status)
  ) {
    return captureOnlyJob;
  }

  const programmableJob = context.programmableCaptureBatchCaptureJob;
  if (
    context.programmableCapturePending &&
    hasCaptureJob(programmableJob) &&
    isRuntimeJobInFlight(programmableJob.status)
  ) {
    return programmableJob;
  }

  return null;
};

const captureStatsFromProgress = (context: SocialContext): CaptureStats => ({
  completed: numberOrZero(context.pipelineProgress?.captureCompletedCount),
  failed: numberOrZero(context.pipelineProgress?.captureFailureCount),
  remaining: numberOrZero(context.pipelineProgress?.captureRemainingCount),
  total: numberOrZero(context.pipelineProgress?.captureTotalCount),
});

const captureStatsFromJob = (job: CaptureJob): CaptureStats => ({
  completed: numberOrZero(job.progress?.completedCount),
  failed: numberOrZero(job.progress?.failureCount),
  remaining: numberOrZero(job.progress?.remainingCount),
  total: numberOrZero(job.progress?.totalCount),
});

const isFreshCaptureInProgress = (context: SocialContext): boolean =>
  context.pipelineStep === 'capturing' &&
  context.pipelineProgress?.captureMode === 'fresh_capture';

const getDisplayCaptureStats = (context: SocialContext): CaptureStats | null => {
  if (isFreshCaptureInProgress(context)) return captureStatsFromProgress(context);

  const standaloneJob = selectStandaloneCaptureJob(context);
  if (standaloneJob === null) return null;

  return captureStatsFromJob(standaloneJob);
};

const formatCaptureFailureText = (failed: number): string => {
  if (failed <= 0) return '';
  return ` ${failed} failed.`;
};

const formatCaptureLimit = (limit: number | null | undefined): string =>
  limit === null || limit === undefined ? 'none' : String(limit);

export function SocialJobStatusSection(): React.JSX.Element | null {
  const pills = buildRuntimeJobPills(useSocialPostContext());
  if (pills.length === 0) return null;

  return (
    <div className='mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
      <span className='font-medium text-foreground/80'>Runtime jobs:</span>
      {pills.map((pill) => (
        <SocialJobStatusPill
          key={pill.key}
          status={pill.status}
          label={pill.label}
          title={pill.title}
          className='text-[10px]'
        />
      ))}
    </div>
  );
}

export function SocialPipelineProgress(): React.JSX.Element | null {
  const { pipelineProgress, pipelineStep } = useSocialPostContext();
  if (!BUSY_PIPELINE_STEPS.has(pipelineStep)) return null;

  const value = pipelineProgressValue(pipelineProgress?.step ?? pipelineStep);
  const message = pipelineProgress?.message ?? '';

  return (
    <div className='space-y-2'>
      <KangurProgressBar accent='slate' value={value} size='sm' />
      <div className='text-center text-[10px] uppercase tracking-wider text-muted-foreground'>
        {Math.round(value)}% complete
      </div>
      {message.length > 0 ? (
        <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground'>
          {message}
        </div>
      ) : null}
    </div>
  );
}

export function SocialCaptureProgressSection(): React.JSX.Element | null {
  const stats = getDisplayCaptureStats(useSocialPostContext());
  if (stats === null || stats.total <= 0) return null;

  return (
    <div className='grid grid-cols-3 gap-2 text-xs'>
      <CaptureMetric label='Captured' value={stats.completed} />
      <CaptureMetric label='Left' value={stats.remaining} />
      <CaptureMetric failed={stats.failed} label='Total' value={stats.total} />
    </div>
  );
}

function CaptureMetric({
  failed = 0,
  label,
  value,
}: {
  failed?: number;
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
      <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
        {label}
      </div>
      <div className='mt-1 font-semibold text-foreground'>
        {value}
        {failed > 0 ? (
          <span className='ml-2 text-[10px] font-medium text-destructive'>
            {failed} failed
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SocialPipelineInfo(): React.JSX.Element {
  const context = useSocialPostContext();
  const stats = getDisplayCaptureStats(context);

  return (
    <div className='rounded-xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground'>
      <div className='mb-1 text-[10px] font-medium uppercase tracking-tight text-foreground/80'>
        Pipeline info
      </div>
      {stats !== null && stats.total > 0 ? (
        <div className='mb-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-foreground/90'>
          Live Playwright capture: {stats.completed} captured, {stats.remaining} left.
          {formatCaptureFailureText(stats.failed)}
        </div>
      ) : null}
      <ul className='list-inside list-disc space-y-1'>
        <li>Full pipeline: Load context → Generate PL/EN draft → Attach screenshots.</li>
        <li>
          Fresh capture: Triggers Playwright batch capture ({context.batchCapturePresetIds.length}{' '}
          presets, limit: {formatCaptureLimit(context.batchCapturePresetLimit)}) before generation.
        </li>
        <li>Capture only: Updates screenshots for the active draft without re-generating text.</li>
      </ul>
    </div>
  );
}
