import { type JSX } from 'react';

import { Button, Card, CompactEmptyState, FormSection, MetadataItem, StatusBadge } from '@/features/kangur/shared/ui';

import { useObservabilitySummaryContext } from '../../AdminKangurObservabilityPage';
import { useKnowledgeGraphObservability } from './KnowledgeGraphObservabilityContext';
import { formatDateTime } from './utils';

export function RecentAnalyticsEvents(): JSX.Element {
  const {
    summary: {
      analytics: { recent: events },
    },
  } = useObservabilitySummaryContext();
  const {
    knowledgeGraphPreviewReplayCandidates: replayCandidates,
    knowledgeGraphPreviewDraft: draft,
    replayAnalyticsEventInKnowledgeGraphPreview: onReplayEvent,
  } = useKnowledgeGraphObservability();

  const activeReplayEventId = draft.replayEventId;
  const replayCandidateById = new Map(
    replayCandidates.map((candidate) => [candidate.id, candidate] as const)
  );

  return (
    <div id='recent-analytics-events'>
      <FormSection title='Recent Analytics Events' variant='subtle'>
        {events.length === 0 ? (
          <CompactEmptyState
            title='No recent analytics events'
            description='Client telemetry has not recorded a recent Kangur event in this window.'
           />
        ) : (
          <div className='space-y-2'>
            {events.map((event) => {
              const replayCandidate = replayCandidateById.get(event.id) ?? null;
              const isLoadedInPreview = replayCandidate?.id === activeReplayEventId;

              return (
                <Card
                  key={event.id}
                  variant='subtle'
                  padding='sm'
                  className='border-border/60 bg-card/40'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-semibold text-white'>
                        {event.name ?? event.type}
                      </div>
                      <div className='mt-1 truncate text-xs text-gray-400'>{event.path || '—'}</div>
                    </div>
                    <StatusBadge status={event.type === 'pageview' ? 'info' : 'active'} />
                  </div>
                  <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                    <MetadataItem label='At' value={formatDateTime(event.ts)} variant='minimal' />
                    <MetadataItem
                      label='Visitor'
                      value={event.visitorId || '—'}
                      variant='minimal'
                      mono
                    />
                    <MetadataItem
                      label='Session'
                      value={event.sessionId || '—'}
                      variant='minimal'
                      mono
                    />
                  </div>
                  {replayCandidate ? (
                    <div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3'>
                      <div className='min-w-0 flex-1 space-y-1'>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
                          Replayable tutor prompt
                        </div>
                        <p className='truncate text-xs text-gray-300'>
                          {replayCandidate.latestUserMessage}
                        </p>
                      </div>
                      <Button
                        variant={isLoadedInPreview ? 'outline' : 'ghost'}
                        size='sm'
                        onClick={() => onReplayEvent(replayCandidate.id)}
                      >
                        {isLoadedInPreview ? 'Loaded in graph preview' : 'Replay in graph preview'}
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
}

export function RecentServerLogs(): JSX.Element {
  const {
    summary: {
      serverLogs: { recent: logs },
    },
  } = useObservabilitySummaryContext();

  return (
    <FormSection title='Recent Server Logs' variant='subtle'>
      {logs.length === 0 ? (
        <CompactEmptyState
          title='No recent server logs'
          description='No Kangur server-side log entries were captured in this window.'
         />
      ) : (
        <div className='space-y-2'>
          {logs.map((log) => (
            <Card
              key={log.id}
              variant='subtle'
              padding='sm'
              className='border-border/60 bg-card/40'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-semibold text-white'>{log.message}</div>
                  <div className='mt-1 truncate text-xs text-gray-400'>
                    {[log.source, log.path].filter(Boolean).join(' • ') || 'Kangur server event'}
                  </div>
                </div>
                <StatusBadge status={log.level} />
              </div>
              <div className='mt-3 grid gap-2 sm:grid-cols-3'>
                <MetadataItem label='At' value={formatDateTime(log.createdAt)} variant='minimal' />
                <MetadataItem label='Request' value={log.requestId || '—'} variant='minimal' mono />
                <MetadataItem label='Trace' value={log.traceId || '—'} variant='minimal' mono />
              </div>
            </Card>
          ))}
        </div>
      )}
    </FormSection>
  );
}
