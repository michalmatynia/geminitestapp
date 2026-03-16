'use client';

import React from 'react';

import { useInterval } from '@/shared/hooks/use-interval';
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
  const snapshot = React.useMemo(() => readCaseResolverWorkspaceObservabilitySnapshot(), [events]);
  const conflictRatePercent = (snapshot.conflictRate * 100).toFixed(1);
  const successRatePercent = (snapshot.saveSuccessRate * 100).toFixed(1);
  const sync = React.useCallback((): void => {
    setEvents(readCaseResolverWorkspaceDebugEvents());
  }, []);

  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const eventName = getCaseResolverWorkspaceDebugEventName();
    sync();
    window.addEventListener(eventName, sync);
    return (): void => {
      window.removeEventListener(eventName, sync);
    };
  }, [enabled, sync]);

  useInterval(() => {
    sync();
  }, enabled ? 2000 : null);

  if (!enabled) return null;

  const recent = events.slice(-25).reverse();
  return (
    <Card className='fixed bottom-4 right-4 z-50 flex max-h-[60vh] w-[420px] flex-col border-border/70 bg-black/80 p-2 text-[11px] text-gray-100 shadow-xl backdrop-blur'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='font-medium text-gray-100'>Workspace Debug</span>
        <span className='font-mono text-[10px] text-gray-300'>events: {events.length}</span>
      </div>
      <div className='mb-2 grid grid-cols-2 gap-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
        <span>save p95: {Math.round(snapshot.persistDurationMs.p95)}ms</span>
        <span>payload p95: {Math.round(snapshot.payloadBytes.p95)}B</span>
        <span>success: {successRatePercent}%</span>
        <span>conflict: {conflictRatePercent}%</span>
      </div>
      <div className='mb-2 space-y-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
        <div className='font-medium text-gray-100'>Hydration</div>
        {snapshot.latestHydrationSelection ? (
          <div className='space-y-0.5'>
            <div>
              source={snapshot.latestHydrationSelection.source ?? 'n/a'} reason=
              {snapshot.latestHydrationSelection.reason ?? 'n/a'}
            </div>
            <div>
              has_store=
              {snapshot.latestHydrationSelection.hasStore === null
                ? 'n/a'
                : snapshot.latestHydrationSelection.hasStore
                  ? 'true'
                  : 'false'}{' '}
              has_heavy=
              {snapshot.latestHydrationSelection.hasHeavy === null
                ? 'n/a'
                : snapshot.latestHydrationSelection.hasHeavy
                  ? 'true'
                  : 'false'}{' '}
              rev={snapshot.latestHydrationSelection.workspaceRevision ?? 'n/a'}
            </div>
            <div className='text-gray-400'>{snapshot.latestHydrationSelection.timestamp}</div>
          </div>
        ) : (
          <div className='text-gray-400'>No hydration source event yet.</div>
        )}
      </div>
      <div className='mb-2 space-y-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
        <div className='font-medium text-gray-100'>Requested Context</div>
        {snapshot.latestRequestedContext ? (
          <div className='space-y-0.5'>
            <div>action={snapshot.latestRequestedContext.action}</div>
            <div>
              status={snapshot.latestRequestedContext.requestedCaseStatus ?? 'n/a'} issue=
              {snapshot.latestRequestedContext.requestedCaseIssue ?? 'n/a'} via=
              {snapshot.latestRequestedContext.resolvedVia ?? 'n/a'}
            </div>
            <div>request_key={snapshot.latestRequestedContext.requestKey ?? 'n/a'}</div>
            <div className='text-gray-400'>{snapshot.latestRequestedContext.timestamp}</div>
          </div>
        ) : (
          <div className='text-gray-400'>No requested-context event yet.</div>
        )}
      </div>
      <div className='space-y-1 overflow-auto pr-1 font-mono'>
        {recent.length === 0 ? (
          <div className='text-gray-400'>No workspace events captured.</div>
        ) : null}
        {recent.map((entry) => (
          <div key={entry.id} className='rounded border border-border/60 bg-black/30 px-2 py-1'>
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
