'use client';

import React from 'react';

import { Card } from '@/shared/ui';

import { readCaseResolverWorkspaceObservabilitySnapshot } from '../workspace-observability';
import {
  getCaseResolverWorkspaceDebugEventName,
  readCaseResolverWorkspaceDebugEvents,
} from '../workspace-persistence';

type CaseResolverWorkspaceDebugPanelProps = {
  enabled: boolean;
};

export function CaseResolverWorkspaceDebugPanel({
  enabled,
}: CaseResolverWorkspaceDebugPanelProps): React.JSX.Element | null {
  const [events, setEvents] = React.useState(() => readCaseResolverWorkspaceDebugEvents());
  const snapshot = React.useMemo(
    () => readCaseResolverWorkspaceObservabilitySnapshot(),
    [events]
  );
  const conflictRatePercent = (snapshot.conflictRate * 100).toFixed(1);
  const successRatePercent = (snapshot.saveSuccessRate * 100).toFixed(1);

  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const eventName = getCaseResolverWorkspaceDebugEventName();
    const sync = (): void => {
      setEvents(readCaseResolverWorkspaceDebugEvents());
    };
    sync();
    const intervalId = window.setInterval(sync, 2000);
    window.addEventListener(eventName, sync);
    return (): void => {
      window.clearInterval(intervalId);
      window.removeEventListener(eventName, sync);
    };
  }, [enabled]);

  if (!enabled) return null;

  const recent = events.slice(-25).reverse();
  return (
    <Card className='fixed bottom-4 right-4 z-50 flex max-h-[60vh] w-[420px] flex-col border-border/70 bg-black/80 p-2 text-[11px] text-gray-100 shadow-xl backdrop-blur'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='font-medium text-gray-100'>Workspace Debug</span>
        <span className='font-mono text-[10px] text-gray-300'>
          events: {events.length}
        </span>
      </div>
      <div className='mb-2 grid grid-cols-2 gap-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
        <span>save p95: {Math.round(snapshot.persistDurationMs.p95)}ms</span>
        <span>payload p95: {Math.round(snapshot.payloadBytes.p95)}B</span>
        <span>success: {successRatePercent}%</span>
        <span>conflict: {conflictRatePercent}%</span>
      </div>
      <div className='space-y-1 overflow-auto pr-1 font-mono'>
        {recent.length === 0 ? (
          <div className='text-gray-400'>No workspace events captured.</div>
        ) : null}
        {recent.map((entry) => (
          <div
            key={entry.id}
            className='rounded border border-border/60 bg-black/30 px-2 py-1'
          >
            <div className='text-[10px] text-gray-400'>
              {entry.timestamp} | {entry.source}
            </div>
            <div className='text-gray-100'>{entry.action}</div>
            <div className='text-[10px] text-gray-300'>
              rev={entry.workspaceRevision ?? '-'} exp={entry.expectedRevision ?? '-'} cur=
              {entry.currentRevision ?? '-'} mut={entry.mutationId ?? '-'}
            </div>
            <div className='text-[10px] text-gray-400'>
              dur={entry.durationMs ?? '-'}ms size={entry.payloadBytes ?? '-'}B
            </div>
            {entry.message ? (
              <div className='text-[10px] text-amber-200'>{entry.message}</div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
