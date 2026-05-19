'use client';

import React from 'react';

import { Badge } from '@/shared/ui';
import { SocialJobStatusPill } from './SocialJobStatusPill';
import {
  emptyToUndefined,
  formatRuntimeJobTitle,
  runtimeJobStatus,
} from './SocialPost.VisualsRuntime';
import type {
  SocialVisualAnalysisModalContext,
  VisualAnalysisModalMetadata,
  VisualAnalysisModalSelectionState,
} from './SocialPost.VisualAnalysisModalState';

type RuntimeJobLike = Parameters<typeof runtimeJobStatus>[0];

function QueueJobPill({
  job,
  label,
}: {
  job: RuntimeJobLike;
  label: string;
}): React.JSX.Element | null {
  const status = runtimeJobStatus(job);
  if (status.length === 0) return null;

  return (
    <SocialJobStatusPill
      status={status}
      label={label}
      title={emptyToUndefined(formatRuntimeJobTitle(job, ''))}
      className='text-[10px]'
    />
  );
}

function VisualAnalysisJobPill({
  metadata,
}: {
  metadata: VisualAnalysisModalMetadata;
}): React.JSX.Element | null {
  if (metadata.status === null) return null;
  return (
    <SocialJobStatusPill
      status={metadata.status}
      label='Image analysis'
      title={emptyToUndefined(metadata.title)}
      className='text-[10px]'
    />
  );
}

export function SocialVisualAnalysisModalHeader({
  context,
  metadata,
  modelLabel,
  selection,
}: {
  context: SocialVisualAnalysisModalContext;
  metadata: VisualAnalysisModalMetadata;
  modelLabel: string;
  selection: VisualAnalysisModalSelectionState;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
      <Badge variant='outline'>Vision model: {modelLabel}</Badge>
      <Badge variant='outline'>
        {selection.selectedCount} selected visual{selection.selectedCount === 1 ? '' : 's'}
      </Badge>
      <VisualAnalysisJobPill metadata={metadata} />
      <QueueJobPill job={context.currentGenerationJob} label='Generate post' />
      <QueueJobPill job={context.currentPipelineJob} label='Full pipeline' />
    </div>
  );
}
