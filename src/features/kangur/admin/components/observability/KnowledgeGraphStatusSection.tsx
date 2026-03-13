'use client';

import * as React from 'react';

import { Alert, Button, EmptyState, FormSection, StatusBadge, MetadataItem } from '@/shared/ui';

import { useKnowledgeGraphObservability } from './KnowledgeGraphObservabilityContext';
import { describeKnowledgeGraphStatus, formatDateTime, formatNumber, resolveKnowledgeGraphBadgeStatus, formatKnowledgeGraphReadiness } from './utils';

export function KnowledgeGraphStatusSection(): React.JSX.Element {
  const {
    knowledgeGraphStatus,
    knowledgeGraphStatusIsRefreshing,
    knowledgeGraphIsSyncing,
    knowledgeGraphSyncFeedback,
    knowledgeGraphStatusError: error,
    refreshKnowledgeGraphStatus: onRefresh,
    syncKnowledgeGraph: onSync,
  } = useKnowledgeGraphObservability();

  const isRefreshing = knowledgeGraphStatusIsRefreshing;
  const isSyncing = knowledgeGraphIsSyncing;
  const syncFeedback = knowledgeGraphSyncFeedback;

  if (knowledgeGraphStatus.mode === 'disabled') {
    return (
      <div id='knowledge-graph-status'>
        <FormSection title='Knowledge Graph Status' variant='subtle'>
          <EmptyState
            title='Neo4j graph status disabled'
            description={knowledgeGraphStatus.message}
            variant='compact'
            action={
              <Button variant='outline' size='sm' onClick={onRefresh} disabled={isRefreshing}>
                Refresh graph status
              </Button>
            }
          />
        </FormSection>
      </div>
    );
  }

  if (knowledgeGraphStatus.mode === 'error') {
    return (
      <div id='knowledge-graph-status'>
        <FormSection title='Knowledge Graph Status' variant='subtle'>
          <div className='space-y-3'>
            <Alert variant='error'>
              <div className='font-semibold'>Neo4j connection error</div>
              <p className='mt-1 text-xs opacity-90'>{knowledgeGraphStatus.message}</p>
            </Alert>
            <Button variant='outline' size='sm' onClick={onRefresh} disabled={isRefreshing}>
              Retry status check
            </Button>
          </div>
        </FormSection>
      </div>
    );
  }

  // mode is 'status'
  const status = knowledgeGraphStatus;

  return (
    <div id='knowledge-graph-status'>
      <FormSection title='Knowledge Graph Status' variant='subtle'>
        {error ? (
          <Alert variant='warning' className='mb-4'>
            {error.message}
          </Alert>
        ) : null}
        
        <div className='space-y-4'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='space-y-1.5'>
              <div className='flex flex-wrap items-center gap-3'>
                <StatusBadge
                  status={resolveKnowledgeGraphBadgeStatus(status)}
                  label={formatKnowledgeGraphReadiness(status.semanticReadiness)}
                />
                <div className='text-sm font-semibold text-white'>
                  {status.graphKey}
                </div>
              </div>
              <p className='max-w-2xl text-xs leading-relaxed text-gray-400'>
                {describeKnowledgeGraphStatus(status)}
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              {syncFeedback ? (
                <div
                  className={
                    syncFeedback.tone === 'success' ? 'text-xs text-emerald-400' : 'text-xs text-rose-400'
                  }
                >
                  {syncFeedback.message}
                </div>
              ) : null}
              <Button
                variant='outline'
                size='sm'
                onClick={onSync}
                disabled={isSyncing || isRefreshing}
              >
                {isSyncing ? 'Syncing...' : 'Sync Graph'}
              </Button>
              <Button variant='ghost' size='sm' onClick={onRefresh} disabled={isRefreshing}>
                {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
              </Button>
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <MetadataItem label='Locale' value={status.locale || '—'} variant='card' />
            <MetadataItem
              label='Last Sync'
              value={formatDateTime(status.syncedAt)}
              variant='card'
            />
            <MetadataItem
              label='Live Nodes'
              value={formatNumber(status.liveNodeCount)}
              variant='card'
            />
            <MetadataItem
              label='Live Edges'
              value={formatNumber(status.liveEdgeCount)}
              variant='card'
            />
            <MetadataItem
              label='Synced Nodes'
              value={formatNumber(status.syncedNodeCount)}
              variant='card'
            />
            <MetadataItem
              label='Synced Edges'
              value={formatNumber(status.syncedEdgeCount)}
              variant='card'
            />
            <MetadataItem
              label='Embeddings'
              value={formatNumber(status.embeddingNodeCount)}
              variant='card'
            />
            <MetadataItem
              label='Vector Index'
              value={status.vectorIndexPresent ? 'Online' : 'Missing'}
              variant='card'
            />
          </div>
        </div>
      </FormSection>
    </div>
  );
}
