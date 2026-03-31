'use client';

import React from 'react';

import type {
  CaseResolverWorkspaceDebugEvent,
  CaseResolverWorkspaceObservabilitySnapshot,
  RequestedContextSnapshot,
  WorkspaceHydrationSelectionSnapshot,
} from '@/shared/contracts/case-resolver';

type SummaryStatsProps = {
  snapshot: CaseResolverWorkspaceObservabilitySnapshot;
  eventsCount: number;
};

type HydrationSectionProps = {
  selection: WorkspaceHydrationSelectionSnapshot | null;
};

type RequestedContextSectionProps = {
  requestedContext: RequestedContextSnapshot | null;
};

type EventListProps = {
  events: CaseResolverWorkspaceDebugEvent[];
};

export function CaseResolverWorkspaceSummaryStats({
  snapshot,
  eventsCount,
}: SummaryStatsProps): React.JSX.Element {
  const conflictRatePercent = (snapshot.conflictRate * 100).toFixed(1);
  const successRatePercent = (snapshot.saveSuccessRate * 100).toFixed(1);

  return (
    <>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <span className='font-medium text-gray-100'>Workspace Debug</span>
        <span className='font-mono text-[10px] text-gray-300'>events: {eventsCount}</span>
      </div>
      <div className='mb-2 grid grid-cols-2 gap-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
        <span>save p95: {Math.round(snapshot.persistDurationMs.p95)}ms</span>
        <span>payload p95: {Math.round(snapshot.payloadBytes.p95)}B</span>
        <span>success: {successRatePercent}%</span>
        <span>conflict: {conflictRatePercent}%</span>
      </div>
    </>
  );
}

export function CaseResolverWorkspaceHydrationSection({
  selection,
}: HydrationSectionProps): React.JSX.Element {
  return (
    <div className='mb-2 space-y-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
      <div className='font-medium text-gray-100'>Hydration</div>
      {selection ? (
        <div className='space-y-0.5'>
          <div>
            source={selection.source ?? 'n/a'} reason={selection.reason ?? 'n/a'}
          </div>
          <div>
            has_store=
            {selection.hasStore === null ? 'n/a' : selection.hasStore ? 'true' : 'false'}{' '}
            has_heavy=
            {selection.hasHeavy === null ? 'n/a' : selection.hasHeavy ? 'true' : 'false'} rev=
            {selection.workspaceRevision ?? 'n/a'}
          </div>
          <div className='text-gray-400'>{selection.timestamp}</div>
        </div>
      ) : (
        <div className='text-gray-400'>No hydration source event yet.</div>
      )}
    </div>
  );
}

export function CaseResolverWorkspaceRequestedContextSection({
  requestedContext,
}: RequestedContextSectionProps): React.JSX.Element {
  return (
    <div className='mb-2 space-y-1 rounded border border-border/60 bg-black/40 px-2 py-1 font-mono text-[10px] text-gray-200'>
      <div className='font-medium text-gray-100'>Requested Context</div>
      {requestedContext ? (
        <div className='space-y-0.5'>
          <div>action={requestedContext.action}</div>
          <div>
            status={requestedContext.requestedCaseStatus ?? 'n/a'} issue=
            {requestedContext.requestedCaseIssue ?? 'n/a'} via=
            {requestedContext.resolvedVia ?? 'n/a'}
          </div>
          <div>request_key={requestedContext.requestKey ?? 'n/a'}</div>
          <div className='text-gray-400'>{requestedContext.timestamp}</div>
        </div>
      ) : (
        <div className='text-gray-400'>No requested-context event yet.</div>
      )}
    </div>
  );
}

export function CaseResolverWorkspaceEventList({
  events,
}: EventListProps): React.JSX.Element {
  const recentEvents = events.slice(-25).reverse();

  return (
    <div className='space-y-1 overflow-auto pr-1 font-mono'>
      {recentEvents.length === 0 ? (
        <div className='text-gray-400'>No workspace events captured.</div>
      ) : null}
      {recentEvents.map((entry) => (
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
          {entry.message ? <div className='text-[10px] text-amber-200'>{entry.message}</div> : null}
        </div>
      ))}
    </div>
  );
}
