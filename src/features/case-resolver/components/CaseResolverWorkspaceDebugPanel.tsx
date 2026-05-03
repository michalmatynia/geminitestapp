'use client';

import React from 'react';

import { useInterval } from '@/shared/hooks/use-interval';
import { Card } from '@/shared/ui/primitives.public';

import { getRecentCaseResolverWorkspaceDebugEvents } from './CaseResolverWorkspaceDebugPanel.helpers';
import {
  WorkspaceDebugEventList,
  WorkspaceDebugHydrationSection,
  WorkspaceDebugMetrics,
  WorkspaceDebugRequestedContextSection,
} from './CaseResolverWorkspaceDebugPanel.parts';
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
  const recentEvents = React.useMemo(
    () => getRecentCaseResolverWorkspaceDebugEvents(events),
    [events]
  );
  const sync = React.useCallback((): void => {
    setEvents(readCaseResolverWorkspaceDebugEvents());
  }, []);


  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const eventName = getCaseResolverWorkspaceDebugEventName();
    sync();
    window.addEventListener(eventName, sync);
    return () => {
      window.removeEventListener(eventName, sync);
      return undefined;
    };
  }, [enabled, sync]);

  useInterval(() => {
    sync();
  }, enabled ? 2000 : null);

  if (!enabled) return null;

  return (
    <Card className='fixed bottom-4 right-4 z-50 flex max-h-[60vh] w-[420px] flex-col border-border/70 bg-black/80 p-2 text-[11px] text-gray-100 shadow-xl backdrop-blur'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='font-medium text-gray-100'>Workspace Debug</span>
        <span className='font-mono text-[10px] text-gray-300'>events: {events.length}</span>
      </div>
      <WorkspaceDebugMetrics snapshot={snapshot} />
      <WorkspaceDebugHydrationSection hydration={snapshot.latestHydrationSelection} />
      <WorkspaceDebugRequestedContextSection requestedContext={snapshot.latestRequestedContext} />
      <WorkspaceDebugEventList events={recentEvents} />
    </Card>
  );
}
