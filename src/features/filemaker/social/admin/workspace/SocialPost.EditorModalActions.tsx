'use client';

import type React from 'react';

import { Badge, Button } from '@/shared/ui';

import { SocialJobStatusPill } from './SocialJobStatusPill';
import {
  buildSocialRuntimeJobTitle,
  resolveEditorModalRuntimeState,
} from './SocialPost.EditorModal.runtime';
import { useSocialPostContext } from './SocialPostContext';

type SocialRuntimeJobLike = Parameters<typeof buildSocialRuntimeJobTitle>[0];

const RuntimeJobPill = ({
  job,
  label,
}: {
  job: SocialRuntimeJobLike;
  label: string;
}): React.ReactNode => {
  const status = job?.status ?? null;
  if (status === null || status.length === 0) {
    return null;
  }

  const title = buildSocialRuntimeJobTitle(job);

  return (
    <SocialJobStatusPill
      status={status}
      label={label}
      title={title.length > 0 ? title : undefined}
      className='text-[10px]'
    />
  );
};

export const SocialPostEditorModalActions = (): React.ReactElement | null => {
  const context = useSocialPostContext();
  const runtime = resolveEditorModalRuntimeState(context);

  if (context.activePost === null) {
    return null;
  }

  const handlePublishClick = (): void => {
    void context.handlePublish();
  };

  return (
    <>
      {context.imageAssets.length > 0 ? (
        <Badge variant='outline'>
          {context.imageAssets.length} image
          {context.imageAssets.length === 1 ? '' : 's'}
        </Badge>
      ) : null}
      <RuntimeJobPill job={context.currentVisualAnalysisJob} label='Image analysis' />
      <RuntimeJobPill job={context.currentGenerationJob} label='Generate post' />
      <RuntimeJobPill job={context.currentPipelineJob} label='Full pipeline' />
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handlePublishClick}
        disabled={runtime.isSubmitting || runtime.hasBlockingRuntimeJob || runtime.hasPublication}
        title={runtime.editorActionTitle}
      >
        {runtime.publishActionLabel ?? 'Publish now'}
      </Button>
    </>
  );
};
