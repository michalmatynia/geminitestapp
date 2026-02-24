'use client';

import React, { useMemo } from 'react';
import {
  Button,
  StatusBadge,
  Card,
} from '@/shared/ui';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';
import {
  formatDurationMs,
  formatPercent,
  formatStatusLabel,
  statusToVariant,
} from '../ai-paths-settings-view-utils';

export function AiPathsRuntimeAnalysis(): React.JSX.Element {
  const {
    runtimeAnalyticsQuery,
    runtimeRunStatus,
    runtimeNodeStatuses,
    handleInspectTraceNode,
  } = useAiPathsSettingsPageContext();

  const runtimeNodeStatusEntries = useMemo(
    (): Array<[string, string]> =>
      Object.entries(runtimeNodeStatuses ?? {}).filter(
        (entry: [string, unknown]): entry is [string, string] =>
          typeof entry[1] === 'string' && entry[1].trim().length > 0,
      ),
    [runtimeNodeStatuses],
  );

  const runtimeNodeStatusCounts = useMemo((): Record<string, number> => {
    return runtimeNodeStatusEntries.reduce<Record<string, number>>(
      (acc: Record<string, number>, [, status]: [string, string]) => {
        const normalized = status.trim().toLowerCase();
        acc[normalized] = (acc[normalized] ?? 0) + 1;
        return acc;
      },
      {},
    );
  }, [runtimeNodeStatusEntries]);

  const runtimeNodeLiveStates = useMemo(
    () =>
      runtimeNodeStatusEntries
        .map(([nodeId, status]: [string, string]) => ({
          nodeId,
          status: status.trim().toLowerCase(),
        }))
        .filter(
          (entry) =>
            entry.status === 'running' ||
            entry.status === 'queued' ||
            entry.status === 'polling' ||
            entry.status === 'paused' ||
            entry.status === 'waiting_callback',
        )
        .slice(0, 8),
    [runtimeNodeStatusEntries],
  );

  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-border/60 bg-card/50'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>
            Runtime Analysis
          </div>
          <div className='text-xs text-gray-400'>
            Live runtime state synced from node events plus Redis 24h analytics.
          </div>
        </div>
        <Button
          type='button'
          className='rounded-md border border-border px-2 py-1 text-[10px] text-gray-200 hover:bg-card/70'
          onClick={() => {
            runtimeAnalyticsQuery.refetch().catch(() => {});
          }}
          disabled={runtimeAnalyticsQuery.isFetching}
        >
          {runtimeAnalyticsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className='grid gap-2 sm:grid-cols-3'>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60'>
          <div className='text-[10px] uppercase text-gray-500'>Run Status</div>
          <div className='mt-1 text-sm text-white'>{formatStatusLabel(runtimeRunStatus)}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60'>
          <div className='text-[10px] uppercase text-gray-500'>Live Nodes</div>
          <div className='mt-1 text-sm text-white'>{runtimeNodeLiveStates.length}</div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60'>
          <div className='text-[10px] uppercase text-gray-500'>Storage</div>
          <div className='mt-1 text-sm text-white'>{runtimeAnalyticsQuery.data?.storage ?? '—'}</div>
        </Card>
      </div>

      <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-4'>
        {(['running', 'queued', 'polling', 'completed', 'failed', 'cached'] as const).map((status) => (
          <Card key={status} variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60 px-2 py-1'>
            <span className='text-gray-500'>{formatStatusLabel(status)}:</span>{' '}
            <span className='text-gray-200'>{runtimeNodeStatusCounts[status] ?? 0}</span>
          </Card>
        ))}
      </div>

      <div className='grid gap-2 sm:grid-cols-2'>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Runs (24h)</div>
          <div className='mt-1 text-sm text-white'>{runtimeAnalyticsQuery.data?.runs.total ?? 0}</div>
          <div className='mt-1 text-gray-400'>
            Success: {formatPercent(runtimeAnalyticsQuery.data?.runs.successRate ?? 0)}
          </div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60 text-[11px] text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>Run Runtime (24h)</div>
          <div className='mt-1 text-gray-200'>
            Avg {formatDurationMs(runtimeAnalyticsQuery.data?.runs.avgDurationMs)}
          </div>
          <div className='mt-1 text-gray-400'>
            p95 {formatDurationMs(runtimeAnalyticsQuery.data?.runs.p95DurationMs)}
          </div>
        </Card>
      </div>
      
      {/* Top slow/failed nodes logic would go here if needed */}
    </Card>
  );
}
