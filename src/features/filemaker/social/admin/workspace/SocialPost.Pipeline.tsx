'use client';

import React from 'react';

import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { useSocialPostContext } from './SocialPostContext';
import { SocialPipelineActions } from './SocialPost.PipelineActions';
import { SocialPipelineAlerts } from './SocialPost.PipelineAlerts';
import {
  SocialCaptureProgressSection,
  SocialJobStatusSection,
  SocialPipelineInfo,
  SocialPipelineProgress,
} from './SocialPost.PipelineStatus';
import type { PipelineStep } from './SocialPublishingPage.Constants';

const hasPostId = (postId: string | null | undefined): boolean =>
  (postId?.length ?? 0) > 0;

export function SocialPostPipeline(): React.JSX.Element {
  const {
    activePostId,
    pipelineStep,
    setIsPostEditorModalOpen,
  } = useSocialPostContext();
  const previousPipelineStepRef = React.useRef<PipelineStep>('idle');
  const hasActivePost = hasPostId(activePostId);

  React.useEffect(() => {
    if (
      previousPipelineStepRef.current !== 'done' &&
      pipelineStep === 'done' &&
      hasActivePost
    ) {
      setIsPostEditorModalOpen(true);
    }

    previousPipelineStepRef.current = pipelineStep;
  }, [hasActivePost, pipelineStep, setIsPostEditorModalOpen]);

  return (
    <KangurAdminCard>
      <SocialPipelineActions />
      <SocialJobStatusSection />
      <div className='mt-4 space-y-4'>
        <SocialPipelineAlerts />
        <SocialPipelineProgress />
        <SocialCaptureProgressSection />
        <SocialPipelineInfo />
      </div>
    </KangurAdminCard>
  );
}
