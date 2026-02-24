'use client';

import React, { useMemo } from 'react';
import { useRuntimeState } from '../../../context';
import { StatusBadge, EmptyState } from '@/shared/ui';

export function AiPathsRuntimeLog(): React.JSX.Element {
  const { runtimeEvents } = useRuntimeState();

  const runtimeLogEvents = useMemo(
    () => runtimeEvents.slice(Math.max(0, runtimeEvents.length - 80)).reverse(),
    [runtimeEvents],
  );

  return (
    <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
      <div>
        <div className='text-sm font-semibold text-white'>
          Live Runtime Log
        </div>
        <div className='text-xs text-gray-400'>
          Last {runtimeLogEvents.length} runtime events from local +
          server execution.
        </div>
      </div>
      <div className='max-h-[280px] space-y-2 overflow-y-auto pr-1'>
        {runtimeLogEvents.length > 0 ? (
          runtimeLogEvents.map((event) => (
            <div
              key={event.id}
              className='rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-300'
            >
              <div className='flex flex-wrap items-center gap-1.5 text-[10px]'>
                <span className='text-gray-500'>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <StatusBadge
                  status={event.level ?? 'info'}
                  variant={
                    event.level === 'error'
                      ? 'error'
                      : event.level === 'warn'
                        ? 'warning'
                        : 'info'
                  }
                  size='sm'
                  className='font-bold'
                />
                <StatusBadge
                  status={event.nodeType ?? event.type ?? 'event'}
                  variant='neutral'
                  size='sm'
                  className='border-border/60 text-gray-400'
                />
              </div>
              <div className='mt-1 text-gray-200'>
                {event.message}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title='Log empty'
            description='Runtime log is empty. Fire a trigger to stream node/run events.'
            variant='compact'
            className='border-dashed border-border/60 py-4'
          />
        )}
      </div>
    </div>
  );
}
