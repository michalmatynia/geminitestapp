'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Label } from '@/shared/ui/primitives.public';

import { JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS } from './job-queue-auto-refresh';
import { AiPathsPillButton } from './AiPathsPillButton';
import { useJobQueueActions, useJobQueueState } from './JobQueueContext';

const AUTO_REFRESH_INTERVAL_OPTIONS = JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS.map(
  (value: number) => ({
    value: String(value),
    label: `${value / 1000}s`,
  })
) as ReadonlyArray<LabeledOptionDto<string>>;

export function JobQueueControls(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <JobQueueHeader />
      <JobQueueBottomControls />
    </div>
  );
}

function JobQueueHeader(): React.JSX.Element {
  const {
    panelLabel,
    panelDescription,
    isLoadingRuns,
    isClearingRuns,
  } = useJobQueueState();
  const {
    refetchQueueData,
    setClearScope,
  } = useJobQueueActions();

  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div>
        <Hint size='xs' uppercase={false} className='font-semibold text-white'>
          {panelLabel}
        </Hint>
        <div className='text-xs text-gray-400'>{panelDescription}</div>
      </div>
      <div className='flex flex-wrap gap-2'>
        <AiPathsPillButton
          className='text-gray-200'
          onClick={refetchQueueData}
          disabled={isLoadingRuns}
        >
          {isLoadingRuns ? 'Refreshing...' : 'Refresh'}
        </AiPathsPillButton>
        <AiPathsPillButton
          variant='destructive'
          inactiveClassName=''
          onClick={() => setClearScope('terminal')}
          disabled={isClearingRuns}
        >
          <Trash2 className='mr-1 size-3' />
          Clear Finished
        </AiPathsPillButton>
        <AiPathsPillButton
          variant='destructive'
          inactiveClassName=''
          onClick={() => setClearScope('all')}
          disabled={isClearingRuns}
        >
          <Trash2 className='mr-1 size-3' />
          Clear All
        </AiPathsPillButton>
      </div>
    </div>
  );
}

function JobQueueBottomControls(): React.JSX.Element {
  const {
    autoRefreshEnabled,
    autoRefreshInterval,
    expandedRunIds,
  } = useJobQueueState();
  const {
    setAutoRefreshEnabled,
    setAutoRefreshInterval,
    pauseAllStreams,
    reconnectAllStreams,
  } = useJobQueueActions();

  return (
    <div className='flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
      <AiPathsPillButton
        active={autoRefreshEnabled}
        onClick={() => setAutoRefreshEnabled((prev: boolean) => !prev)}
      >
        {autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
      </AiPathsPillButton>
      <div className='flex items-center gap-2'>
        <Label className='text-[10px] uppercase text-gray-500'>Base interval</Label>
        <SelectSimple
          size='xs'
          value={String(autoRefreshInterval)}
          onValueChange={(value: string) => setAutoRefreshInterval(Number.parseInt(value, 10))}
          disabled={!autoRefreshEnabled}
          options={AUTO_REFRESH_INTERVAL_OPTIONS}
          ariaLabel='Base interval'
          triggerClassName='h-7 w-[110px] border-border bg-card/70 text-[11px] text-white'
          title='Select option'
        />
      </div>
      <AiPathsPillButton
        className='text-gray-200'
        onClick={pauseAllStreams}
        disabled={expandedRunIds.size === 0}
      >
        Pause all streams
      </AiPathsPillButton>
      <AiPathsPillButton
        className='text-gray-200'
        onClick={reconnectAllStreams}
        disabled={expandedRunIds.size === 0}
      >
        Reconnect all streams
      </AiPathsPillButton>
    </div>
  );
}
