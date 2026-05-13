import React from 'react';
import type {
  BrainOperationsDomainKey,
  BrainOperationsRecentEvent,
} from '@/shared/contracts/ai-brain';
import {
  eventToneClass,
  formatUpdatedAt,
  toEventStatusLabel,
} from './operations-tab-utils';

interface DomainCardEventsProps {
  domainKey: BrainOperationsDomainKey;
  recentEvents: BrainOperationsRecentEvent[];
  selectedRangeLabel: string;
}

export function DomainCardEvents({
  domainKey,
  recentEvents,
  selectedRangeLabel,
}: DomainCardEventsProps): React.JSX.Element {
  return (
    <div className='space-y-2 rounded-md border border-border/60 bg-background/30 p-2'>
      <div className='text-[10px] uppercase text-gray-500'>
        Recent events ({selectedRangeLabel})
      </div>
      {recentEvents.length === 0 ? (
        <div className='text-xs text-gray-400'>No recent events in sampled records.</div>
      ) : (
        <div className='space-y-1'>
          {recentEvents.map((event) => (
            <div
              key={`${domainKey}:${event.id ?? event.timestamp}:${event.status}`}
              className='flex items-center justify-between rounded border border-border/50 bg-background/40 px-2 py-1 text-[11px]'
            >
              <span className={`font-medium ${eventToneClass(event.status)}`}>
                {toEventStatusLabel(event.status)}
              </span>
              <span className='text-gray-400'>{formatUpdatedAt(event.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
