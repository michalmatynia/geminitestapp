'use client';

import React from 'react';

import { LoadingState } from '@/shared/ui';

import { SocialJobStatusPill } from './SocialJobStatusPill';
import type {
  SocialPostPlaywrightCaptureContext,
  SocialPostPlaywrightCaptureModalState,
} from './SocialPost.PlaywrightCaptureModal.runtime';

export function SocialPostPlaywrightPersonaAlerts({
  personasError,
  personasLoading,
}: {
  personasError: unknown;
  personasLoading: boolean;
}): React.JSX.Element {
  return (
    <>
      {personasLoading ? (
        <LoadingState
          message='Loading Playwright personas...'
          size='sm'
          className='rounded-xl border border-border/60 bg-background/40 py-4'
        />
      ) : null}
      {personasError !== null ? (
        <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
          Failed to load Playwright personas. The default runtime persona will still work.
        </div>
      ) : null}
    </>
  );
}

export function SocialPostPlaywrightRuntimeJobs({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element | null {
  if (!state.hasAnyRuntimeJobStatus) return null;

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
      <span className='font-medium text-foreground/80'>Runtime jobs:</span>
      <RuntimeJobPill
        label='Image analysis'
        status={context.currentVisualAnalysisJob?.status ?? null}
        title={state.currentVisualAnalysisJobTitle}
      />
      <RuntimeJobPill
        label='Generate post'
        status={context.currentGenerationJob?.status ?? null}
        title={state.currentGenerationJobTitle}
      />
      <RuntimeJobPill
        label='Full pipeline'
        status={context.currentPipelineJob?.status ?? null}
        title={state.currentPipelineJobTitle}
      />
    </div>
  );
}

function RuntimeJobPill({
  label,
  status,
  title,
}: {
  label: string;
  status: string | null;
  title: string;
}): React.JSX.Element | null {
  if (status === null || status.trim().length === 0) return null;
  return (
    <SocialJobStatusPill
      status={status}
      label={label}
      title={title.length > 0 ? title : undefined}
      className='text-[10px]'
    />
  );
}

export function SocialPostPlaywrightCaptureAlerts({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <>
      {context.activePost === null ? (
        <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
          No active draft is selected. You can still edit the programmable Playwright config and save it as defaults, but capture actions stay disabled until a draft is active.
        </div>
      ) : null}
      {state.routeValidation.issueCount > 0 ? (
        <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
          Fix {state.routeValidation.issueCount} programmable route issue
          {state.routeValidation.issueCount === 1 ? '' : 's'} before starting capture.
          {state.routeValidation.firstIssue !== null ? ` ${state.routeValidation.firstIssue}` : ''}
        </div>
      ) : null}
    </>
  );
}

export function SocialPostPlaywrightCaptureProgress({
  state,
}: {
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element | null {
  if (!state.shouldShowProgrammableCaptureProgress) return null;

  return (
    <div className='grid grid-cols-3 gap-2 text-xs'>
      <ProgressTile label='Captured' value={state.programmableCaptureCompletedCount} />
      <ProgressTile label='Left' value={state.programmableCaptureRemainingCount} />
      <ProgressTile
        label='Total'
        value={state.programmableCaptureTotalCount}
        failureCount={state.programmableCaptureFailureCount}
      />
    </div>
  );
}

function ProgressTile({
  failureCount = 0,
  label,
  value,
}: {
  failureCount?: number;
  label: string;
  value: number;
}): React.JSX.Element {
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2'>
      <div className='text-[10px] uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div className='mt-1 font-semibold text-foreground'>
        {value}
        {failureCount > 0 ? (
          <span className='ml-2 text-[10px] font-medium text-destructive'>
            {failureCount} failed
          </span>
        ) : null}
      </div>
    </div>
  );
}
