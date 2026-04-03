'use client';

import React from 'react';

import type {
  CaseResolverWorkspaceDebugEvent,
  CaseResolverWorkspaceObservabilitySnapshot,
  RequestedContextSnapshot,
  WorkspaceHydrationSelectionSnapshot,
} from '@/shared/contracts/case-resolver';

import {
  buildCaseResolverWorkspaceDebugMetrics,
  buildCaseResolverWorkspaceEventLines,
  buildCaseResolverWorkspaceHydrationLines,
  buildCaseResolverWorkspaceRequestedContextLines,
} from './CaseResolverWorkspaceDebugPanel.helpers';

function WorkspaceDebugSection(props: {
  title: string;
  emptyLabel: string;
  lines: string[];
  timestamp: string | null;
}): React.JSX.Element {
  const { emptyLabel, lines, timestamp, title } = props;

  return (
    <div className='mb-2 space-y-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
      <div className='font-medium text-gray-100'>{title}</div>
      {lines.length > 0 ? (
        <div className='space-y-0.5'>
          {lines.map((line: string) => (
            <div key={line}>{line}</div>
          ))}
          {timestamp ? <div className='text-gray-400'>{timestamp}</div> : null}
        </div>
      ) : (
        <div className='text-gray-400'>{emptyLabel}</div>
      )}
    </div>
  );
}

export function WorkspaceDebugMetrics(props: {
  snapshot: CaseResolverWorkspaceObservabilitySnapshot;
}): React.JSX.Element {
  const { snapshot } = props;

  return (
    <div className='mb-2 grid grid-cols-2 gap-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
      {buildCaseResolverWorkspaceDebugMetrics(snapshot).map((metric) => (
        <span key={metric.label}>
          {metric.label}: {metric.value}
        </span>
      ))}
    </div>
  );
}

export function WorkspaceDebugHydrationSection(props: {
  hydration: WorkspaceHydrationSelectionSnapshot | null;
}): React.JSX.Element {
  const { hydration } = props;

  return (
    <WorkspaceDebugSection
      title='Hydration'
      emptyLabel='No hydration source event yet.'
      lines={hydration ? buildCaseResolverWorkspaceHydrationLines(hydration) : []}
      timestamp={hydration?.timestamp ?? null}
    />
  );
}

export function WorkspaceDebugRequestedContextSection(props: {
  requestedContext: RequestedContextSnapshot | null;
}): React.JSX.Element {
  const { requestedContext } = props;

  return (
    <WorkspaceDebugSection
      title='Requested Context'
      emptyLabel='No requested-context event yet.'
      lines={
        requestedContext
          ? buildCaseResolverWorkspaceRequestedContextLines(requestedContext)
          : []
      }
      timestamp={requestedContext?.timestamp ?? null}
    />
  );
}

export function WorkspaceDebugEventList(props: {
  events: CaseResolverWorkspaceDebugEvent[];
}): React.JSX.Element {
  const { events } = props;

  return (
    <div className='space-y-1 overflow-auto pr-1 font-mono'>
      {events.length === 0 ? (
        <div className='text-gray-400'>No workspace events captured.</div>
      ) : null}
      {events.map((entry: CaseResolverWorkspaceDebugEvent) => (
        <div key={entry.id} className='rounded border border-border/60 bg-black/30 px-2 py-1'>
          <div className='text-[10px] text-gray-400'>
            {entry.timestamp} | {entry.source}
          </div>
          <div className='text-gray-100'>{entry.action}</div>
          {buildCaseResolverWorkspaceEventLines(entry).map((line: string) => (
            <div key={line} className='text-[10px] text-gray-300'>
              {line}
            </div>
          ))}
          {entry.message ? (
            <div className='text-[10px] text-amber-200'>{entry.message}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
