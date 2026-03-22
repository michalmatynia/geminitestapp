import React, { useMemo } from 'react';

import type { AiPathRuntimeEvent } from '@/shared/lib/ai-paths';
import { CompactEmptyState } from '@/shared/ui';
import { RuntimeEventEntry } from '../runtime-event-entry';

type AiPathsRuntimeEventLogProps = {
  events: AiPathRuntimeEvent[];
  overflowNotice?: React.ReactNode;
};

export function AiPathsRuntimeEventLog({
  events,
  overflowNotice,
}: AiPathsRuntimeEventLogProps): React.JSX.Element {
  const runtimeLogEvents = useMemo(
    () => events.slice(Math.max(0, events.length - 80)).reverse(),
    [events]
  );

  return (
    <div className='space-y-3 rounded-lg border border-border/60 bg-card/50 p-4'>
      <div>
        <div className='text-sm font-semibold text-white'>Live Runtime Log</div>
        <div className='text-xs text-gray-400'>
          Last {runtimeLogEvents.length} runtime events from local + server execution.
        </div>
      </div>
      {overflowNotice}
      <div className='max-h-[280px] space-y-2 overflow-y-auto pr-1'>
        {runtimeLogEvents.length > 0 ? (
          runtimeLogEvents.map((event) => (
            <RuntimeEventEntry
              key={event.id}
              timestamp={new Date(event.timestamp).toLocaleTimeString()}
              level={event.level}
              kind={event.nodeType ?? event.type}
              message={event.message}
              className='rounded-md border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-300'
              timeClassName='text-gray-500'
              levelClassName='font-bold'
              kindClassName='border-border/60 text-gray-400'
              stacked
            />
          ))
        ) : (
          <CompactEmptyState
            title='Log empty'
            description='Runtime log is empty. Fire a trigger to stream node/run events.'
            className='border-dashed border-border/60 py-4'
          />
        )}
      </div>
    </div>
  );
}
