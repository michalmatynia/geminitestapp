import React from 'react';

import { useRuntimeState } from '@/features/ai/ai-paths/context';

import { AiPathsRuntimeEventLog } from '../AiPathsRuntimeEventLog';

export function AiPathsRuntimeLog(): React.JSX.Element {
  const { runtimeEvents, eventsOverflowed } = useRuntimeState();

  return (
    <AiPathsRuntimeEventLog
      events={runtimeEvents}
      overflowNotice={
        eventsOverflowed ? (
          <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
            Older events were dropped (log capped at {runtimeEvents.length} entries). Open Run
            Detail for the full server-side event history.
          </div>
        ) : undefined
      }
    />
  );
}
