'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { useJobQueueContext } from './JobQueueContext';
import { JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS } from './job-queue-auto-refresh';
import { Button, Hint, Label, SelectSimple } from '@/shared/ui';

export function JobQueueControls(): React.JSX.Element {
  const {
    panelLabel,
    panelDescription,
    refetchQueueData,
    isLoadingRuns,
    setClearScope,
    isClearingRuns,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    autoRefreshInterval,
    setAutoRefreshInterval,
    pauseAllStreams,
    resumeAllStreams,
    expandedRunIds,
  } = useJobQueueContext();

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <Hint size='xs' uppercase={false} className='font-semibold text-white'>
            {panelLabel}
          </Hint>
          <div className='text-xs text-gray-400'>{panelDescription}</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={refetchQueueData}
            disabled={isLoadingRuns}
          >
            {isLoadingRuns ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('terminal')}
            disabled={isClearingRuns}
          >
            <Trash2 className='mr-1 size-3' />
            Clear Finished
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={() => setClearScope('all')}
            disabled={isClearingRuns}
          >
            <Trash2 className='mr-1 size-3' />
            Clear All
          </Button>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-3 text-[11px] text-gray-400'>
        <Button
          type='button'
          className={`rounded-md border px-2 py-1 text-[10px] ${
            autoRefreshEnabled
              ? 'border-emerald-500/50 text-emerald-200'
              : 'text-gray-300 hover:bg-muted/60'
          }`}
          onClick={() => setAutoRefreshEnabled((prev: boolean) => !prev)}
        >
          {autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
        </Button>
        <div className='flex items-center gap-2'>
          <Label className='text-[10px] uppercase text-gray-500'>Base interval</Label>
          <SelectSimple
            size='xs'
            value={String(autoRefreshInterval)}
            onValueChange={(value: string) => setAutoRefreshInterval(Number.parseInt(value, 10))}
            disabled={!autoRefreshEnabled}
            options={JOB_QUEUE_AUTO_REFRESH_INTERVAL_OPTIONS.map((value: number) => ({
              value: String(value),
              label: `${value / 1000}s`,
            }))}
            triggerClassName='h-7 w-[110px] border-border bg-card/70 text-[11px] text-white'
          />
        </div>
        <Button
          type='button'
          className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={pauseAllStreams}
          disabled={expandedRunIds.size === 0}
        >
          Pause all streams
        </Button>
        <Button
          type='button'
          className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
          onClick={resumeAllStreams}
          disabled={expandedRunIds.size === 0}
        >
          Resume all streams
        </Button>
      </div>
    </div>
  );
}
