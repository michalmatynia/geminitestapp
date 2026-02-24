'use client';

import React, { useMemo, useCallback } from 'react';
import { useAiPathRuntimeAnalytics } from '@/features/ai/ai-paths/hooks/useAiPathQueries';
import { useAiPathsSettingsOrchestrator } from '../AiPathsSettingsOrchestratorContext';
import {
  Button,
  Card,
  StatusBadge,
  useToast,
} from '@/shared/ui';
import {
  formatDurationMs,
  formatPercent,
  formatStatusLabel,
  statusToVariant,
} from '../ai-paths-settings-view-utils';
import { runsApi } from '@/features/ai/ai-paths/lib';

export function AiPathsRuntimeAnalysis(): React.JSX.Element | null {
  const state = useAiPathsSettingsOrchestrator();
  const {
    runtimeRunStatus,
    runtimeNodeStatuses,
    activePathId,
    nodes,
  } = state;
  const { toast } = useToast();

  const runtimeAnalyticsQuery = useAiPathRuntimeAnalytics(
    '24h',
    true // Assuming it's active if rendered
  );

  const nodeTitleById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    nodes.forEach((node) => {
      map.set(node.id, node.title ?? node.id);
    });
    return map;
  }, [nodes]);

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
    (): Array<{ nodeId: string; title: string; status: string }> =>
      runtimeNodeStatusEntries
        .map(([nodeId, status]: [string, string]) => ({
          nodeId,
          title: nodeTitleById.get(nodeId) ?? nodeId,
          status: status.trim().toLowerCase(),
        }))
        .filter(
          (entry: { nodeId: string; title: string; status: string }) =>
            entry.status === 'running' ||
            entry.status === 'queued' ||
            entry.status === 'polling' ||
            entry.status === 'paused' ||
            entry.status === 'waiting_callback',
        )
        .slice(0, 8),
    [nodeTitleById, runtimeNodeStatusEntries],
  );

  const fetchLatestRunIdForTraceNode = useCallback(
    async (nodeId: string, preferFailed: boolean): Promise<string | null> => {
      const baseOptions = {
        ...(activePathId ? { pathId: activePathId } : {}),
        nodeId,
        limit: 1,
        offset: 0,
      };
      const readFirstRunId = (payload: any): string | null => {
        if (!payload.ok || !payload.data || !Array.isArray(payload.data.runs)) return null;
        const firstRun = payload.data.runs[0];
        return typeof firstRun?.id === 'string' && firstRun.id.trim().length > 0
          ? firstRun.id.trim()
          : null;
      };

      if (preferFailed) {
        const failedResult = await runsApi.list({
          ...baseOptions,
          status: 'failed',
        });
        const failedRunId = readFirstRunId(failedResult);
        if (failedRunId) return failedRunId;
      }

      const fallbackResult = await runsApi.list(baseOptions);
      return readFirstRunId(fallbackResult);
    },
    [activePathId],
  );

  const handleInspectTraceNode = useCallback(
    async (nodeId: string, focus: 'all' | 'failed'): Promise<void> => {
      const targetNodeId = nodeId.trim();
      if (!targetNodeId) return;
      const runId = await fetchLatestRunIdForTraceNode(
        targetNodeId,
        focus === 'failed',
      );
      if (!runId) {
        toast(`No recent runs found for ${targetNodeId}.`, { variant: 'warning' });
        return;
      }
      state.setRunHistoryNodeId(targetNodeId);
      state.setRunFilter(focus);
      await state.handleOpenRunDetail(runId).catch((error: unknown) => {
        state.reportAiPathsError(
          error,
          {
            action: 'inspectRuntimeTraceNode',
            runId,
            nodeId: targetNodeId,
          },
          'Failed to open runtime trace node drill-down:',
        );
        toast('Failed to open run details for trace node.', { variant: 'error' });
      });
    },
    [
      fetchLatestRunIdForTraceNode,
      state,
      toast,
    ],
  );

  return (
    <Card variant='subtle' padding='md' className='space-y-3 border-border/60 bg-card/50'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>
            Runtime Analysis
          </div>
          <div className='text-xs text-gray-400'>
            Live runtime state synced from node events plus Redis 24h
            analytics.
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
          {runtimeAnalyticsQuery.isFetching
            ? 'Refreshing...'
            : 'Refresh'}
        </Button>
      </div>

      <div className='grid gap-2 sm:grid-cols-3'>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60'>
          <div className='text-[10px] uppercase text-gray-500'>
            Run Status
          </div>
          <div className='mt-1 text-sm text-white'>
            {formatStatusLabel(runtimeRunStatus)}
          </div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60'>
          <div className='text-[10px] uppercase text-gray-500'>
            Live Nodes
          </div>
          <div className='mt-1 text-sm text-white'>
            {runtimeNodeLiveStates.length}
          </div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60'>
          <div className='text-[10px] uppercase text-gray-500'>
            Storage
          </div>
          <div className='mt-1 text-sm text-white'>
            {runtimeAnalyticsQuery.data?.storage ?? '—'}
          </div>
        </Card>
      </div>

      <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-4'>
        {(
          [
            'running',
            'queued',
            'polling',
            'completed',
            'failed',
            'cached',
          ] as const
        ).map((status) => (
          <Card
            key={status}
            variant='subtle-compact'
            padding='sm'
            className='border-border/60 bg-card/60 px-2 py-1'
          >
            <span className='text-gray-500'>
              {formatStatusLabel(status)}:
            </span>{' '}
            <span className='text-gray-200'>
              {runtimeNodeStatusCounts[status] ?? 0}
            </span>
          </Card>
        ))}
      </div>

      {runtimeNodeLiveStates.length > 0 ? (
        <div className='space-y-1'>
          <div className='text-[10px] uppercase text-gray-500'>
            Active Node States
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {runtimeNodeLiveStates.map(
              (entry: {
                nodeId: string;
                title: string;
                status: string;
              }) => (
                <StatusBadge
                  key={entry.nodeId}
                  status={
                    entry.title +
                    ' · ' +
                    formatStatusLabel(entry.status)
                  }
                  variant={statusToVariant(entry.status)}
                  size='sm'
                  title={entry.nodeId}
                  className='font-medium'
                />
              ),
            )}
          </div>
        </div>
      ) : (
        <div className='text-xs text-gray-500'>
          No active runtime node statuses right now.
        </div>
      )}

      <div className='grid gap-2 sm:grid-cols-2'>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60 p-2 text-[11px] text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>
            Runs (24h)
          </div>
          <div className='mt-1 text-sm text-white'>
            {runtimeAnalyticsQuery.data?.runs.total ?? 0}
          </div>
          <div className='mt-1 text-gray-400'>
            Success:{' '}
            {formatPercent(
              runtimeAnalyticsQuery.data?.runs.successRate ?? 0,
            )}
          </div>
        </Card>
        <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/60 text-[11px] text-gray-300'>
          <div className='text-[10px] uppercase text-gray-500'>
            Run Runtime (24h)
          </div>
          <div className='mt-1 text-gray-200'>
            Avg{' '}
            {formatDurationMs(
              runtimeAnalyticsQuery.data?.runs.avgDurationMs,
            )}
          </div>
          <div className='mt-1 text-gray-400'>
            p95{' '}
            {formatDurationMs(
              runtimeAnalyticsQuery.data?.runs.p95DurationMs,
            )}
          </div>
          <div className='mt-2 text-[10px] uppercase text-gray-500'>
            Node spans
          </div>
          <div className='mt-1 text-gray-200'>
            Runs sampled {runtimeAnalyticsQuery.data?.traces.sampledRuns ?? 0} ·
            spans {runtimeAnalyticsQuery.data?.traces.sampledSpans ?? 0}
          </div>
          <div className='mt-1 text-gray-400'>
            Span avg{' '}
            {formatDurationMs(
              runtimeAnalyticsQuery.data?.traces.avgDurationMs,
            )}{' '}
            · p95{' '}
            {formatDurationMs(
              runtimeAnalyticsQuery.data?.traces.p95DurationMs,
            )}
          </div>
          {runtimeAnalyticsQuery.data?.traces.slowestSpan ? (
            <div className='mt-1 text-gray-500'>
              Slowest {runtimeAnalyticsQuery.data.traces.slowestSpan.nodeId} (
              {runtimeAnalyticsQuery.data.traces.slowestSpan.nodeType}) ·{' '}
              {formatDurationMs(
                runtimeAnalyticsQuery.data.traces.slowestSpan.durationMs,
              )}
            </div>
          ) : null}
          {(runtimeAnalyticsQuery.data?.traces.topSlowNodes.length ?? 0) > 0 ? (
            <div className='mt-1 text-gray-500'>
              <div>Top slow:</div>
              <div className='mt-1 flex flex-wrap gap-1'>
                {runtimeAnalyticsQuery.data?.traces.topSlowNodes
                  .slice(0, 2)
                  .map((entry) => (
                    <button
                      key={`slow-${entry.nodeId}-${entry.nodeType}`}
                      type='button'
                      className='rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-100 hover:bg-sky-500/20'
                      onClick={() => {
                        void handleInspectTraceNode(entry.nodeId, 'all');
                      }}
                      title='Open latest run detail for this node'
                    >
                      {entry.nodeId} (
                      {formatDurationMs(entry.avgDurationMs)} avg)
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
          {(runtimeAnalyticsQuery.data?.traces.topFailedNodes.length ?? 0) > 0 ? (
            <div className='mt-1 text-gray-500'>
              <div>Top failed:</div>
              <div className='mt-1 flex flex-wrap gap-1'>
                {runtimeAnalyticsQuery.data?.traces.topFailedNodes
                  .slice(0, 2)
                  .map((entry) => (
                    <button
                      key={`failed-${entry.nodeId}-${entry.nodeType}`}
                      type='button'
                      className='rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-100 hover:bg-rose-500/20'
                      onClick={() => {
                        void handleInspectTraceNode(entry.nodeId, 'failed');
                      }}
                      title='Open latest failed run detail for this node'
                    >
                      {entry.nodeId} ({entry.failedCount}/{entry.spanCount})
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </Card>
  );
}
