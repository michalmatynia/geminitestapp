'use client';

import React from 'react';

import { SocialJobStatusPill } from './SocialJobStatusPill';
import { type useSocialPostContext } from './SocialPostContext';

export type SocialVisualsContext = ReturnType<typeof useSocialPostContext>;

type RuntimeJobLike = {
  failedReason?: string | null;
  id?: string | null;
  progress?: { message?: string | null } | null;
  status?: string | null;
} | null | undefined;

const RUNTIME_BLOCK_TITLE = 'Wait for the current Social runtime job to finish.';

export const hasText = (value: string | null | undefined): boolean =>
  (value?.length ?? 0) > 0;

export const getRuntimeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase() ?? '';
  if (normalized.length === 0) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export const runtimeJobStatus = (job: RuntimeJobLike): string => {
  if (job === null || job === undefined) return '';
  return getRuntimeString(job.status);
};

export const runtimeJobId = (job: RuntimeJobLike): string => {
  if (job === null || job === undefined) return '';
  return getRuntimeString(job.id);
};

export const runtimeJobFailedReason = (job: RuntimeJobLike): string => {
  if (job === null || job === undefined) return '';
  return getRuntimeString(job.failedReason);
};

const runtimeJobProgressMessage = (job: RuntimeJobLike): string => {
  if (job === null || job === undefined) return '';
  return getRuntimeString(job.progress?.message);
};

export const emptyToUndefined = (value: string): string | undefined => {
  if (value.length === 0) return undefined;
  return value;
};

export const formatTitleParts = (parts: Array<string | null | undefined>): string =>
  parts.filter((value): value is string => hasText(value)).join(' · ');

export const formatRuntimeJobTitle = (
  job: RuntimeJobLike,
  savedFailure: string
): string => {
  const jobId = runtimeJobId(job);
  return formatTitleParts([
    runtimeJobProgressMessage(job),
    runtimeJobFailedReason(job),
    savedFailure,
    jobId.length > 0 ? `Queue job: ${jobId}` : null,
  ]);
};

export const hasBlockingVisualMutationJob = (context: SocialVisualsContext): boolean =>
  isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentVisualAnalysisJob)) ||
  isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentGenerationJob)) ||
  isSocialRuntimeJobInFlight(runtimeJobStatus(context.currentPipelineJob));

export const visualMutationBlockTitle = (blocked: boolean): string | undefined => {
  if (blocked) return RUNTIME_BLOCK_TITLE;
  return undefined;
};

function RuntimeJobPill({
  job,
  label,
  savedFailure = '',
}: {
  job: RuntimeJobLike;
  label: string;
  savedFailure?: string;
}): React.JSX.Element | null {
  const status = runtimeJobStatus(job);
  if (status.length === 0) return null;

  return (
    <SocialJobStatusPill
      status={status}
      label={label}
      title={emptyToUndefined(formatRuntimeJobTitle(job, savedFailure))}
      className='text-[10px]'
    />
  );
}

export function SocialRuntimeJobsRow({
  context,
  savedVisualFailure = '',
}: {
  context: SocialVisualsContext;
  savedVisualFailure?: string;
}): React.JSX.Element | null {
  const hasRuntimeJobs =
    runtimeJobStatus(context.currentVisualAnalysisJob).length > 0 ||
    runtimeJobStatus(context.currentGenerationJob).length > 0 ||
    runtimeJobStatus(context.currentPipelineJob).length > 0;

  if (!hasRuntimeJobs) return null;

  return (
    <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
      <span className='font-medium text-foreground/80'>Runtime jobs:</span>
      <RuntimeJobPill
        job={context.currentVisualAnalysisJob}
        label='Image analysis'
        savedFailure={savedVisualFailure}
      />
      <RuntimeJobPill job={context.currentGenerationJob} label='Generate post' />
      <RuntimeJobPill job={context.currentPipelineJob} label='Full pipeline' />
    </div>
  );
}
