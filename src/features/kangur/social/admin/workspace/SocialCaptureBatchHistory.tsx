'use client';

import { Button } from '@/features/kangur/shared/ui';
import type {
  KangurSocialImageAddonsBatchJob,
  KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';
import {
  buildKangurSocialCaptureFailureSummary,
  normalizeKangurSocialCaptureFailureReason,
  resolveFailedKangurSocialProgrammableCaptureRoutes,
  resolveFailedKangurSocialPresetIds,
  resolveKangurSocialCaptureTargetLabel,
} from '@/features/kangur/social/shared/social-capture-feedback';

const JOB_STATUS_LABELS: Record<KangurSocialImageAddonsBatchJob['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

const formatTimestamp = (value: string): string => {
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatCaptureStatusLabel = (status: string | null | undefined): string | null => {
  const normalized = status?.trim();
  if (!normalized) {
    return null;
  }

  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatDurationMs = (value: number | null | undefined): string | null => {
  if (!Number.isFinite(value) || value == null || value < 0) {
    return null;
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  const seconds = value / 1000;
  return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)} s`;
};

const resolveJobTotalCount = (job: KangurSocialImageAddonsBatchJob): number => {
  if (typeof job.progress?.totalCount === 'number') {
    return job.progress.totalCount;
  }

  if ((job.result?.captureResults.length ?? 0) > 0) {
    return job.result?.captureResults.length ?? 0;
  }

  const programmableRouteCount = job.request?.playwrightRoutes.length ?? 0;
  if (programmableRouteCount > 0) {
    return programmableRouteCount;
  }

  const requestedPresetCount =
    job.result?.requestedPresetCount ?? job.request?.presetIds.length ?? 0;
  if (requestedPresetCount > 0) {
    return requestedPresetCount;
  }

  return (job.result?.addons.length ?? 0) + (job.result?.failures.length ?? 0);
};

const resolveRetryableFailureCount = (
  job: KangurSocialImageAddonsBatchJob,
  retryKind: 'preset' | 'programmable',
  routes: KangurSocialProgrammableCaptureRoute[]
): number => {
  const failures = job.result?.failures ?? [];
  if (retryKind === 'preset') {
    return resolveFailedKangurSocialPresetIds(failures).length;
  }
  return resolveFailedKangurSocialProgrammableCaptureRoutes(
    failures,
    job.request?.playwrightRoutes ?? routes
  ).length;
};

export type SocialCaptureBatchHistoryConfig = {
  title: string;
  description: string;
  emptyMessage: string;
  retryKind?: 'preset' | 'programmable';
  retryActionLabel?: string;
  retryDisabled?: boolean;
  retryTitle?: string;
};

export type SocialCaptureBatchHistoryActions = {
  onRetryFailed?: (job: KangurSocialImageAddonsBatchJob) => void;
};

export function SocialCaptureBatchHistory({
  config,
  jobs,
  routes = [],
  actions = {},
}: {
  config: SocialCaptureBatchHistoryConfig;
  jobs: KangurSocialImageAddonsBatchJob[];
  routes?: KangurSocialProgrammableCaptureRoute[];
  actions?: SocialCaptureBatchHistoryActions;
}) {
  const {
    title,
    description,
    emptyMessage,
    retryKind,
    retryActionLabel,
    retryDisabled = false,
    retryTitle,
  } = config;
  const { onRetryFailed } = actions;

  return (
    <div className='space-y-3 rounded-xl border border-border/60 bg-background/40 p-4'>
      <div>
        <div className='text-sm font-semibold text-foreground'>{title}</div>
        <div className='text-xs text-muted-foreground'>{description}</div>
      </div>
      {jobs.length === 0 ? (
        <div className='rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs text-muted-foreground'>
          {emptyMessage}
        </div>
      ) : (
        <div className='space-y-3'>
          {jobs.map((job) => {
            const resolvedRoutes = job.request?.playwrightRoutes ?? routes;
            const captureResults = job.result?.captureResults ?? [];
            const completedCount =
              captureResults.length > 0
                ? captureResults.filter((result) => result.status === 'ok').length
                : (job.result?.addons.length ?? 0);
            const failedCount =
              captureResults.length > 0
                ? captureResults.filter((result) => result.status === 'failed').length
                : (job.result?.failures.length ?? 0);
            const skippedCount = captureResults.filter((result) => result.status === 'skipped').length;
            const retryableFailureCount =
              retryKind && onRetryFailed
                ? resolveRetryableFailureCount(job, retryKind, routes)
                : 0;
            const failureSummary = job.result
              ? buildKangurSocialCaptureFailureSummary(job.result.failures, {
                  routes: resolvedRoutes,
                  maxItems: 2,
                })
              : null;
            const isProgrammableJob = (job.request?.playwrightRoutes?.length ?? 0) > 0;
            const progressTargets = [
              job.progress?.currentCaptureId
                ? {
                    id: job.progress.currentCaptureId,
                    label: 'Current target',
                    status: job.progress.currentCaptureStatus ?? null,
                  }
                : null,
              job.progress?.lastCaptureId &&
              job.progress.lastCaptureId !== job.progress?.currentCaptureId
                ? {
                    id: job.progress.lastCaptureId,
                    label: 'Last processed',
                    status: job.progress.lastCaptureStatus ?? null,
                  }
                : null,
            ].filter(
              (
                value
              ): value is {
                id: string;
                label: string;
                status: string | null;
              } => value !== null
            );

            return (
              <div
                key={job.id}
                className='space-y-3 rounded-lg border border-border/50 bg-background/70 px-3 py-3'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-sm font-medium text-foreground'>
                      Run {job.runId}
                    </div>
                    <div className='flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
                      <span>{JOB_STATUS_LABELS[job.status]}</span>
                      <span>{formatTimestamp(job.updatedAt)}</span>
                      <span>{isProgrammableJob ? 'Programmable capture' : 'Preset capture'}</span>
                      {job.request?.baseUrl ? (
                        <span className='break-all'>Base URL: {job.request.baseUrl}</span>
                      ) : null}
                    </div>
                  </div>
                  {retryableFailureCount > 0 && retryKind && onRetryFailed ? (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => onRetryFailed(job)}
                      disabled={retryDisabled}
                      title={retryTitle}
                    >
                      {retryActionLabel ??
                        (retryKind === 'preset' ? 'Retry failed presets' : 'Retry failed routes')}
                    </Button>
                  ) : null}
                </div>

                <div className='flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
                  <span>Completed: {completedCount}</span>
                  <span>Failed: {failedCount}</span>
                  {skippedCount > 0 ? <span>Skipped: {skippedCount}</span> : null}
                  <span>Total: {resolveJobTotalCount(job)}</span>
                  {job.request?.presetIds?.length ? (
                    <span>Presets: {job.request.presetIds.length}</span>
                  ) : null}
                  {job.request?.playwrightRoutes?.length ? (
                    <span>Routes: {job.request.playwrightRoutes.length}</span>
                  ) : null}
                </div>

                {job.progress?.message || progressTargets.length > 0 ? (
                  <div className='space-y-2'>
                    <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                      Progress
                    </div>
                    {job.progress?.message ? (
                      <div className='rounded-lg border border-border/40 bg-background px-3 py-2 text-xs text-muted-foreground'>
                        {job.progress.message}
                      </div>
                    ) : null}
                    {progressTargets.length > 0 ? (
                      <div className='space-y-2'>
                        {progressTargets.map((target) => (
                          <div
                            key={`${job.id}-${target.label}-${target.id}`}
                            className='rounded-lg border border-border/40 bg-background px-3 py-2 text-xs'
                          >
                            <div className='font-medium text-foreground'>{target.label}</div>
                            <div className='mt-1 text-muted-foreground'>
                              {resolveKangurSocialCaptureTargetLabel(target.id, resolvedRoutes)}
                            </div>
                            {target.status ? (
                              <div className='mt-1 text-muted-foreground'>
                                {formatCaptureStatusLabel(target.status)}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {captureResults.length > 0 ? (
                  <div className='space-y-2'>
                    <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                      Targets
                    </div>
                    <div className='space-y-2'>
                      {captureResults.map((result) => {
                        const targetLabel =
                          result.title?.trim() ||
                          resolveKangurSocialCaptureTargetLabel(result.id, resolvedRoutes);
                        const statusLabel = formatCaptureStatusLabel(result.status);
                        const stageLabel = formatCaptureStatusLabel(result.stage);
                        const durationLabel = formatDurationMs(result.durationMs);

                        return (
                          <div
                            key={`${job.id}-target-${result.id}`}
                            className='rounded-lg border border-border/40 bg-background px-3 py-2 text-xs'
                          >
                            <div className='flex flex-wrap items-start justify-between gap-2'>
                              <div className='font-medium text-foreground'>{targetLabel}</div>
                              {statusLabel ? (
                                <div className='text-muted-foreground'>{statusLabel}</div>
                              ) : null}
                            </div>
                            <div className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground'>
                              {stageLabel ? <span>Stage: {stageLabel}</span> : null}
                              {result.attemptCount ? <span>Attempts: {result.attemptCount}</span> : null}
                              {durationLabel ? <span>Duration: {durationLabel}</span> : null}
                            </div>
                            {result.resolvedUrl ? (
                              <div className='mt-1 break-all text-muted-foreground'>
                                URL: {result.resolvedUrl}
                              </div>
                            ) : null}
                            {result.artifactName ? (
                              <div className='mt-1 text-muted-foreground'>
                                Artifact: {result.artifactName}
                              </div>
                            ) : null}
                            {result.reason ? (
                              <div className='mt-1 text-destructive'>
                                Reason: {normalizeKangurSocialCaptureFailureReason(result.reason)}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {failureSummary ? (
                  <div className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
                    Failed targets: {failureSummary}
                  </div>
                ) : null}

                {job.error ? (
                  <div className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
                    {job.error}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SocialCaptureBatchHistory;
