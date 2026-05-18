'use client';

import type React from 'react';

import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';

import { SocialJobStatusPill } from '../SocialJobStatusPill';
import { useSocialPostContext } from '../SocialPostContext';
import {
  buildSocialRuntimeJobTitle,
  hasSocialRuntimeJobStatus,
} from './SocialSettingsCaptureTab.runtime';

type RuntimeJobPillProps = {
  job: {
    id?: string | null;
    status?: string | null;
    failedReason?: string | null;
    progress?: { message?: string | null } | null;
  } | null;
  label: string;
};

const RuntimeJobPill = ({ job, label }: RuntimeJobPillProps): React.ReactNode => {
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

export function SocialSettingsCaptureRuntimeJobsCard(): React.ReactElement | null {
  const {
    currentVisualAnalysisJob,
    currentGenerationJob,
    currentPipelineJob,
  } = useSocialPostContext();
  const runtimeJobs = [currentVisualAnalysisJob, currentGenerationJob, currentPipelineJob];

  if (!hasSocialRuntimeJobStatus(runtimeJobs)) {
    return null;
  }

  return (
    <KangurAdminCard>
      <div className='space-y-2'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Runtime jobs</div>
          <div className='text-sm text-muted-foreground'>
            Live queue status for the active Social Publishing draft.
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <RuntimeJobPill job={currentVisualAnalysisJob} label='Image analysis' />
          <RuntimeJobPill job={currentGenerationJob} label='Generate post' />
          <RuntimeJobPill job={currentPipelineJob} label='Full pipeline' />
        </div>
      </div>
    </KangurAdminCard>
  );
}
