'use client';

import React from 'react';

import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { SOCIAL_PUBLISHING_CAPTURE_PRESETS } from '@/features/filemaker/social/shared/social-capture-presets';
import { Button, FormField, Input, SelectSimple } from '@/shared/ui';
import { cn } from '@/shared/utils/ui-utils';

import { SocialCaptureBatchHistory } from '../SocialCaptureBatchHistory';
import { useSocialPostContext } from '../SocialPostContext';
import { useSocialSettingsModalContext } from './SocialSettingsModalContext';
import {
  filterRecentPresetCaptureJobs,
  isBatchCaptureJobInFlight,
  resolveCaptureActionState,
  resolveLastBatchResultSummary,
  type LastBatchResultSummary,
  type SocialCaptureActionState,
} from './SocialSettingsCaptureTab.runtime';

type BatchCaptureFormProps = {
  actionState: SocialCaptureActionState;
};

type BatchCaptureProgressItem = {
  failureCount?: number;
  label: string;
  value: number;
};

type BatchCaptureJob = ReturnType<typeof useSocialPostContext>['batchCaptureJob'];
type BatchCaptureProgressState = NonNullable<NonNullable<BatchCaptureJob>['progress']>;

const readBatchCaptureProgress = (
  batchCaptureJob: BatchCaptureJob
): BatchCaptureProgressState | null => batchCaptureJob?.progress ?? null;

const shouldShowBatchCaptureProgress = (
  batchCaptureJob: BatchCaptureJob,
  progress: BatchCaptureProgressState | null
): progress is BatchCaptureProgressState => {
  if (progress === null) {
    return false;
  }
  if (progress.totalCount === 0) {
    return false;
  }

  return isBatchCaptureJobInFlight(batchCaptureJob?.status);
};

const buildBatchCaptureProgressItems = (
  batchCaptureJob: BatchCaptureJob
): BatchCaptureProgressItem[] | null => {
  const progress = readBatchCaptureProgress(batchCaptureJob);

  if (!shouldShowBatchCaptureProgress(batchCaptureJob, progress)) {
    return null;
  }

  return [
    { label: 'Captured', value: progress.completedCount },
    { label: 'Left', value: progress.remainingCount },
    { label: 'Total', value: progress.totalCount, failureCount: progress.failureCount },
  ];
};

const BatchCaptureSettingsForm = ({
  actionState,
}: BatchCaptureFormProps): React.ReactElement => {
  const {
    batchCaptureBaseUrl,
    batchCapturePresetLimit,
    setBatchCaptureBaseUrl,
    setBatchCapturePresetLimit,
  } = useSocialPostContext();

  return (
    <div className='grid gap-3 lg:grid-cols-3'>
      <FormField label='Base URL override' description='Optional local/preview URL.'>
        <Input
          type='url'
          placeholder='https://example.com'
          value={batchCaptureBaseUrl}
          onChange={(event) => setBatchCaptureBaseUrl(event.target.value)}
          size='sm'
          disabled={actionState.hasCaptureActionLock}
          title={actionState.captureActionTitle}
        />
      </FormField>
      <FormField label='Capture limit' description='Max concurrent captures.'>
        <SelectSimple
          value={batchCapturePresetLimit === null ? '' : String(batchCapturePresetLimit)}
          onValueChange={setBatchCapturePresetLimit}
          options={[
            { value: '', label: 'No limit' },
            ...['5', '10', '20', '50'].map((value) => ({ value, label: value })),
          ]}
          size='sm'
          disabled={actionState.hasCaptureActionLock}
          title={actionState.captureActionTitle}
        />
      </FormField>
    </div>
  );
};

const BatchCapturePresetSelector = ({
  actionState,
}: BatchCaptureFormProps): React.ReactElement => {
  const {
    batchCapturePresetIds,
    clearCapturePresets,
    handleToggleCapturePreset,
    selectAllCapturePresets,
  } = useSocialPostContext();

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Presets ({batchCapturePresetIds.length})
        </div>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='ghost' size='xs' onClick={selectAllCapturePresets} disabled={actionState.hasCaptureActionLock} title={actionState.captureActionTitle}>
            Select all
          </Button>
          <Button type='button' variant='ghost' size='xs' onClick={clearCapturePresets} disabled={actionState.hasCaptureActionLock} title={actionState.captureActionTitle}>
            Clear
          </Button>
        </div>
      </div>
      <div className='flex flex-wrap gap-2 rounded-xl border border-border/60 bg-background/40 p-3'>
        {SOCIAL_PUBLISHING_CAPTURE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type='button'
            onClick={() => handleToggleCapturePreset(preset.id)}
            disabled={actionState.hasCaptureActionLock}
            title={actionState.captureActionTitle}
            className={cn(
              'inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors',
              batchCapturePresetIds.includes(preset.id)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            )}
          >
            {preset.title}
          </button>
        ))}
      </div>
    </div>
  );
};

const BatchCaptureLaunchRow = ({
  actionState,
}: BatchCaptureFormProps): React.ReactElement => {
  const context = useSocialPostContext();
  const { batchCaptureLimitSummary } = useSocialSettingsModalContext();
  const batchCaptureMutationPending = context.batchCaptureMutation.isPending;
  const handleLaunchClick = (): void => {
    void context.handleBatchCapture();
  };

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <Button
        type='button'
        size='sm'
        onClick={handleLaunchClick}
        disabled={
          context.batchCapturePresetIds.length === 0 ||
          batchCaptureMutationPending ||
          actionState.hasCaptureActionLock
        }
        title={actionState.captureActionTitle}
      >
        {context.batchCapturePending || batchCaptureMutationPending
          ? 'Capturing...'
          : 'Launch batch capture'}
      </Button>
      <div className='text-xs text-muted-foreground'>{batchCaptureLimitSummary}</div>
    </div>
  );
};

const BatchCaptureProgress = (): React.ReactElement | null => {
  const { batchCaptureJob } = useSocialPostContext();
  const items = buildBatchCaptureProgressItems(batchCaptureJob);

  if (items === null) {
    return null;
  }

  return (
    <div className='grid grid-cols-3 gap-2 text-xs'>
      {items.map((item) => (
        <div key={item.label} className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
          <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>
            {item.label}
          </div>
          <div className='mt-1 font-semibold text-foreground'>
            {item.value}
            {(item.failureCount ?? 0) > 0 ? (
              <span className='ml-2 text-[10px] font-medium text-destructive'>
                {item.failureCount} failed
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

const BatchCaptureAlerts = (): React.ReactElement => {
  const { batchCaptureMessage, batchCaptureErrorMessage } = useSocialPostContext();

  return (
    <>
      {(batchCaptureMessage?.length ?? 0) > 0 ? (
        <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200'>
          {batchCaptureMessage}
        </div>
      ) : null}
      {(batchCaptureErrorMessage?.length ?? 0) > 0 ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
          {batchCaptureErrorMessage}
        </div>
      ) : null}
    </>
  );
};

const LastBatchResultCard = ({
  summary,
}: {
  summary: LastBatchResultSummary;
}): React.ReactElement | null => {
  const { batchCaptureResult } = useSocialPostContext();
  if (batchCaptureResult === null) {
    return null;
  }

  return (
    <div className='rounded-xl border border-border/60 bg-background/40 p-3 text-xs'>
      <div className='font-semibold text-foreground'>Last batch: {batchCaptureResult.runId}</div>
      <div className='mt-1 text-muted-foreground'>
        Completed: {summary.completedCount} • Failed: {summary.failedCount}
        {summary.skippedCount > 0 ? ` • Skipped: ${summary.skippedCount}` : ''} • Total:{' '}
        {summary.totalCount}
      </div>
      {summary.primaryIssueSummary !== null && summary.primaryIssueSummary.length > 0 ? (
        <div className='mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2 py-2 text-destructive'>
          Last failed target: {summary.primaryIssueSummary}
        </div>
      ) : null}
      {summary.failureSummary !== null && summary.failureSummary.length > 0 ? (
        <div className='mt-2 rounded-lg border border-destructive/20 bg-destructive/5 px-2 py-2 text-destructive'>
          Failed targets: {summary.failureSummary}
        </div>
      ) : null}
    </div>
  );
};

const RecentPresetCaptureHistory = ({
  actionState,
}: BatchCaptureFormProps): React.ReactElement => {
  const context = useSocialPostContext();
  const recentPresetCaptureJobs = React.useMemo(
    () => filterRecentPresetCaptureJobs(context.batchCaptureRecentJobs),
    [context.batchCaptureRecentJobs]
  );
  const handleRetryFailed = (
    job: Parameters<typeof context.handleRetryFailedPresetBatchCaptureJob>[0]
  ): void => {
    void context.handleRetryFailedPresetBatchCaptureJob(job);
  };

  return (
    <SocialCaptureBatchHistory
      config={{
        title: 'Recent preset capture runs',
        description:
          'Durable history for recent Settings Capture runs, including retry for failed presets and progress details.',
        emptyMessage: context.batchCaptureRecentJobsLoading
          ? 'Loading recent capture runs...'
          : 'No recent preset capture runs yet.',
        retryKind: 'preset',
        retryDisabled: actionState.hasCaptureActionLock,
        retryTitle: actionState.captureActionTitle,
      }}
      jobs={recentPresetCaptureJobs}
      actions={{ onRetryFailed: handleRetryFailed }}
    />
  );
};

export function SocialSettingsBatchCaptureCard(): React.ReactElement {
  const context = useSocialPostContext();
  const actionState = resolveCaptureActionState({
    batchCapturePending: context.batchCapturePending,
    batchCaptureJob: context.batchCaptureJob,
    runtimeJobs: [
      context.currentVisualAnalysisJob,
      context.currentGenerationJob,
      context.currentPipelineJob,
    ],
  });
  const lastBatchSummary = resolveLastBatchResultSummary(context.batchCaptureResult);

  return (
    <KangurAdminCard>
      <div className='space-y-3'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Batch capture preview</div>
          <div className='text-sm text-muted-foreground'>
            Capture multiple presets at once for the current post.
          </div>
        </div>
        <BatchCaptureSettingsForm actionState={actionState} />
        <BatchCapturePresetSelector actionState={actionState} />
        <BatchCaptureLaunchRow actionState={actionState} />
        <BatchCaptureProgress />
        <BatchCaptureAlerts />
        <LastBatchResultCard summary={lastBatchSummary} />
        <RecentPresetCaptureHistory actionState={actionState} />
      </div>
    </KangurAdminCard>
  );
}
