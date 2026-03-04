'use client';

import React from 'react';

import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/lib/ai-paths';
import { formatDurationMs } from '@/shared/lib/ai-paths';
import { Button, Tooltip, StatusBadge, Alert, type StatusVariant } from '@/shared/ui';

type TimelineItem = {
  id: string;
  timestamp: Date;
  label: string;
  description?: string;
  status?: string | null;
  kind: 'run' | 'node';
  meta?: string | undefined;
};

type TimelineFilter = 'run' | 'node' | 'event';

type NodeDurationRow = {
  id: string;
  label: string;
  status?: string | null;
  durationMs: number | null;
  durationLabel: string | null;
};

const STATUS_SORT_STORAGE_KEY = 'ai-paths-run-timeline-status-sort';
const FILTERS_STORAGE_KEY = 'ai-paths-run-timeline-filters';

const statusToVariant = (status: string | null | undefined): StatusVariant => {
  const s = status?.toLowerCase() || '';
  if (s === 'completed' || s === 'cached' || s === 'success') return 'success';
  if (s === 'failed' || s === 'canceled' || s === 'timeout' || s === 'error') return 'error';
  if (s === 'queued' || s === 'pending' || s === 'blocked') return 'warning';
  if (
    s === 'running' ||
    s === 'paused' ||
    s === 'polling' ||
    s === 'waiting_callback' ||
    s === 'advance_pending' ||
    s === 'processing'
  ) {
    return 'processing';
  }
  return 'neutral';
};

const levelToVariant = (level: string): StatusVariant => {
  const l = level.toLowerCase();
  if (l === 'error') return 'error';
  if (l === 'warning') return 'warning';
  if (l === 'info') return 'info';
  return 'neutral';
};

const toDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDuration = (
  start?: Date | string | null,
  end?: Date | string | null
): string | null => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return null;
  const diffMs = Math.max(endDate.getTime() - startDate.getTime(), 0);
  if (diffMs < 1000) return `${diffMs}ms`;
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

// formatDurationMs imported from @/features/ai/ai-paths/lib

const getDurationMs = (start?: Date | string | null, end?: Date | string | null): number | null => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return null;
  return Math.max(endDate.getTime() - startDate.getTime(), 0);
};

const buildTimelineItems = (run: AiPathRunRecord, nodes: AiPathRunNodeRecord[]): TimelineItem[] => {
  const items: TimelineItem[] = [];
  const createdAt = toDate(run.createdAt);
  if (createdAt) {
    items.push({
      id: `run-created-${run.id}`,
      timestamp: createdAt,
      label: 'Run queued',
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: 'queued',
      kind: 'run',
    });
  }
  const startedAt = toDate(run.startedAt);
  if (startedAt) {
    items.push({
      id: `run-started-${run.id}`,
      timestamp: startedAt,
      label: 'Run started',
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: 'running',
      kind: 'run',
    });
  }

  nodes.forEach((node: AiPathRunNodeRecord): void => {
    const nodeLabel = node.nodeTitle ?? node.nodeId;
    const nodeMeta = node.nodeType ? `${nodeLabel} (${node.nodeType})` : nodeLabel;
    const startAt = toDate(node.startedAt);
    if (startAt) {
      items.push({
        id: `node-start-${node.id}`,
        timestamp: startAt,
        label: 'Node started',
        description: nodeMeta,
        status: 'running',
        kind: 'node',
      });
    }
    const finishAt = toDate(node.finishedAt);
    if (finishAt) {
      const duration = formatDuration(node.startedAt, node.finishedAt);
      const finishDescription = duration ? `${nodeMeta} · ${duration}` : nodeMeta;
      items.push({
        id: `node-finish-${node.id}`,
        timestamp: finishAt,
        label: `Node ${node.status}`,
        description: finishDescription,
        status: node.status,
        kind: 'node',
        meta: node.errorMessage ? `Error: ${node.errorMessage}` : undefined,
      });
    }
  });

  const finishedAt = toDate(run.finishedAt);
  if (finishedAt) {
    items.push({
      id: `run-finished-${run.id}`,
      timestamp: finishedAt,
      label: `Run ${run.status}`,
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: run.status,
      kind: 'run',
      meta: run.errorMessage ? `Error: ${run.errorMessage}` : undefined,
    });
  }

  return items
    .filter((item: TimelineItem): boolean => Number.isFinite(item.timestamp.getTime()))
    .sort(
      (a: TimelineItem, b: TimelineItem): number => a.timestamp.getTime() - b.timestamp.getTime()
    );
};

const formatMetadata = (metadata?: Record<string, unknown> | null): string | null => {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  try {
    return JSON.stringify(metadata, null, 2);
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
};

export function RunTimeline(props: {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
  eventsOverflow?: boolean;
  eventsBatchLimit?: number | null;
}): React.JSX.Element {
  const { run, nodes, events, eventsOverflow, eventsBatchLimit } = props;

  const timelineItems = React.useMemo(
    (): TimelineItem[] => buildTimelineItems(run, nodes),
    [run, nodes]
  );

  const sortedEvents = React.useMemo(
    (): AiPathRunEventRecord[] =>
      [...events].sort(
        (a: AiPathRunEventRecord, b: AiPathRunEventRecord): number =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ),
    [events]
  );

  const [visibleSections, setVisibleSections] = React.useState<Record<TimelineFilter, boolean>>(
    (): Record<TimelineFilter, boolean> => {
      if (typeof window === 'undefined') {
        return { run: true, node: true, event: true };
      }
      try {
        const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as Partial<Record<TimelineFilter, boolean>>) : null;
        return {
          run: parsed?.run ?? true,
          node: parsed?.node ?? true,
          event: parsed?.event ?? true,
        };
      } catch {
        return { run: true, node: true, event: true };
      }
    }
  );

  React.useEffect((): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(visibleSections));
  }, [visibleSections]);

  const filteredTimelineItems = React.useMemo(
    (): TimelineItem[] =>
      timelineItems.filter((item: TimelineItem): boolean => visibleSections[item.kind]),
    [timelineItems, visibleSections]
  );

  const runEntryCount = React.useMemo(
    (): number => timelineItems.filter((item: TimelineItem): boolean => item.kind === 'run').length,
    [timelineItems]
  );

  const nodeEntryCount = React.useMemo(
    (): number =>
      timelineItems.filter((item: TimelineItem): boolean => item.kind === 'node').length,
    [timelineItems]
  );

  const nodeDurationRows = React.useMemo<NodeDurationRow[]>(
    (): NodeDurationRow[] =>
      nodes.map((node: AiPathRunNodeRecord): NodeDurationRow => {
        const nodeLabel = node.nodeTitle ?? node.nodeId;
        const nodeMeta = node.nodeType ? `${nodeLabel} (${node.nodeType})` : nodeLabel;
        const durationMs = getDurationMs(node.startedAt, node.finishedAt);
        return {
          id: node.id,
          label: nodeMeta,
          status: node.status,
          durationMs,
          durationLabel: formatDuration(node.startedAt, node.finishedAt),
        };
      }),
    [nodes]
  );

  const durationStats = React.useMemo((): {
    total: number;
    average: number | null;
    min: number | null;
    max: number | null;
    timedCount: number;
    totalCount: number;
  } => {
    const durations = nodeDurationRows
      .map((row: NodeDurationRow): number | null => row.durationMs)
      .filter((duration: number | null): duration is number => typeof duration === 'number');
    const total = durations.reduce((acc: number, value: number): number => acc + value, 0);
    const average = durations.length > 0 ? Math.round(total / durations.length) : null;
    const min = durations.length > 0 ? Math.min(...durations) : null;
    const max = durations.length > 0 ? Math.max(...durations) : null;
    return {
      total,
      average,
      min,
      max,
      timedCount: durations.length,
      totalCount: nodeDurationRows.length,
    };
  }, [nodeDurationRows]);

  const durationByStatus = React.useMemo((): Array<{
    status: string;
    count: number;
    timedCount: number;
    totalMs: number;
    averageMs: number | null;
    min: NodeDurationRow | null;
    max: NodeDurationRow | null;
  }> => {
    const buckets = new Map<
      string,
      {
        count: number;
        timedCount: number;
        totalMs: number;
        min: NodeDurationRow | null;
        max: NodeDurationRow | null;
      }
    >();
    nodeDurationRows.forEach((row: NodeDurationRow): void => {
      const key = row.status ?? 'unknown';
      const bucket = buckets.get(key) ?? {
        count: 0,
        timedCount: 0,
        totalMs: 0,
        min: null,
        max: null,
      };
      bucket.count += 1;
      if (typeof row.durationMs === 'number') {
        bucket.timedCount += 1;
        bucket.totalMs += row.durationMs;
        if (!bucket.min || row.durationMs < (bucket.min.durationMs ?? Infinity)) {
          bucket.min = row;
        }
        if (!bucket.max || row.durationMs > (bucket.max.durationMs ?? -Infinity)) {
          bucket.max = row;
        }
      }
      buckets.set(key, bucket);
    });

    return Array.from(buckets.entries()).map(
      ([status, data]: [
        string,
        {
          count: number;
          timedCount: number;
          totalMs: number;
          min: NodeDurationRow | null;
          max: NodeDurationRow | null;
        },
      ]) => ({
        status,
        count: data.count,
        timedCount: data.timedCount,
        totalMs: data.totalMs,
        averageMs: data.timedCount > 0 ? Math.round(data.totalMs / data.timedCount) : null,
        min: data.min,
        max: data.max,
      })
    );
  }, [nodeDurationRows]);

  const [statusSort, setStatusSort] = React.useState<'count' | 'avg' | 'total' | 'alpha'>(
    (): 'count' | 'avg' | 'total' | 'alpha' => {
      if (typeof window === 'undefined') return 'count';
      const saved = window.localStorage.getItem(STATUS_SORT_STORAGE_KEY);
      if (saved === 'count' || saved === 'avg' || saved === 'total' || saved === 'alpha') {
        return saved;
      }
      return 'count';
    }
  );

  React.useEffect((): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STATUS_SORT_STORAGE_KEY, statusSort);
  }, [statusSort]);

  const sortedDurationByStatus = React.useMemo((): Array<{
    status: string;
    count: number;
    timedCount: number;
    totalMs: number;
    averageMs: number | null;
    min: NodeDurationRow | null;
    max: NodeDurationRow | null;
  }> => {
    const list = [...durationByStatus];
    if (statusSort === 'count') {
      list.sort(
        (a: { count: number; status: string }, b: { count: number; status: string }): number => {
          if (b.count !== a.count) return b.count - a.count;
          return a.status.localeCompare(b.status);
        }
      );
      return list;
    }
    list.sort(
      (
        a: { averageMs: number | null; totalMs: number; count: number; status: string },
        b: { averageMs: number | null; totalMs: number; count: number; status: string }
      ): number => {
        if (statusSort === 'alpha') {
          return a.status.localeCompare(b.status);
        }
        if (statusSort === 'total') {
          if (b.totalMs !== a.totalMs) return b.totalMs - a.totalMs;
          if (b.count !== a.count) return b.count - a.count;
          return a.status.localeCompare(b.status);
        }
        const aAvg = a.averageMs ?? -1;
        const bAvg = b.averageMs ?? -1;
        if (bAvg !== aAvg) return bAvg - aAvg;
        if (b.count !== a.count) return b.count - a.count;
        return a.status.localeCompare(b.status);
      }
    );
    return list;
  }, [durationByStatus, statusSort]);

  const minMaxNodeDuration = React.useMemo((): {
    min: NodeDurationRow | null;
    max: NodeDurationRow | null;
  } => {
    const timed = nodeDurationRows.filter(
      (row: NodeDurationRow): boolean => typeof row.durationMs === 'number'
    );
    if (timed.length === 0) {
      return { min: null, max: null };
    }
    let min: NodeDurationRow = timed[0]!;
    let max: NodeDurationRow = timed[0]!;
    timed.forEach((row: NodeDurationRow): void => {
      if ((row.durationMs ?? 0) < (min?.durationMs ?? 0)) min = row;
      if ((row.durationMs ?? 0) > (max?.durationMs ?? 0)) max = row;
    });
    return { min: min ?? null, max: max ?? null };
  }, [nodeDurationRows]);

  const toggleSection = (section: TimelineFilter): void => {
    setVisibleSections(
      (prev: Record<TimelineFilter, boolean>): Record<TimelineFilter, boolean> => ({
        ...prev,
        [section]: !prev[section],
      })
    );
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-[11px] uppercase text-gray-500'>Filters</div>
        <div className='flex flex-wrap items-center gap-2'>
          <StatusBadge status='Persisted' variant='success' size='sm' className='font-bold' />
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-300 hover:bg-muted/60'
            onClick={() => {
              setVisibleSections({ run: true, node: true, event: true });
              setStatusSort('count');
            }}
          >
            Restore defaults
          </Button>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-300 hover:bg-muted/60'
            onClick={() => setVisibleSections({ run: true, node: true, event: true })}
          >
            Filters only
          </Button>
          {[
            { id: 'run', label: `Run (${runEntryCount})` },
            { id: 'node', label: `Nodes (${nodeEntryCount})` },
            { id: 'event', label: `Events (${sortedEvents.length})` },
          ].map((filter: { id: string; label: string }): React.JSX.Element => {
            const active = visibleSections[filter.id as TimelineFilter];
            return (
              <Button
                key={filter.id}
                type='button'
                className={`rounded-md border px-2 py-1 text-[10px] ${
                  active
                    ? 'border-emerald-500/50 text-emerald-200'
                    : 'text-gray-300 hover:bg-muted/60'
                }`}
                onClick={() => toggleSection(filter.id as TimelineFilter)}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>
      </div>

      {visibleSections.node ? (
        <div className='rounded-md border border-border/70 bg-black/20 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500'>
            <span className='uppercase'>Node duration summary</span>
            <span>{nodeDurationRows.length} nodes</span>
          </div>
          <div className='mt-1 text-[11px] text-gray-500'>
            Total {formatDurationMs(durationStats.total) ?? '—'} · Avg{' '}
            {formatDurationMs(durationStats.average) ?? '—'} ·{' '}
            {minMaxNodeDuration.min ? (
              <Tooltip
                content={`Fastest: ${minMaxNodeDuration.min.label} · ${formatDurationMs(
                  minMaxNodeDuration.min.durationMs
                )}`}
              >
                <span className='cursor-help'>
                  Min {formatDurationMs(durationStats.min) ?? '—'}
                </span>
              </Tooltip>
            ) : (
              <span>Min —</span>
            )}{' '}
            ·{' '}
            {minMaxNodeDuration.max ? (
              <Tooltip
                content={`Slowest: ${minMaxNodeDuration.max.label} · ${formatDurationMs(
                  minMaxNodeDuration.max.durationMs
                )}`}
              >
                <span className='cursor-help'>
                  Max {formatDurationMs(durationStats.max) ?? '—'}
                </span>
              </Tooltip>
            ) : (
              <span>Max —</span>
            )}{' '}
            · Timed {durationStats.timedCount}/{durationStats.totalCount}
          </div>
          {sortedDurationByStatus.length > 0 ? (
            <div className='mt-2 space-y-2 text-[11px] text-gray-400'>
              <div className='flex flex-wrap items-center gap-2 text-gray-500'>
                <span className='uppercase'>Sort by</span>
                {(
                  [
                    { id: 'count', label: 'Count' },
                    { id: 'avg', label: 'Avg duration' },
                    { id: 'total', label: 'Total duration' },
                    { id: 'alpha', label: 'A-Z' },
                  ] as const
                ).map(
                  (option: {
                    id: 'count' | 'total' | 'avg' | 'alpha';
                    label: string;
                  }): React.JSX.Element => {
                    const active = statusSort === option.id;
                    return (
                      <Button
                        key={option.id}
                        type='button'
                        className={`rounded-md border px-2 py-1 text-[10px] ${
                          active
                            ? 'border-emerald-500/50 text-emerald-200'
                            : 'text-gray-300 hover:bg-muted/60'
                        }`}
                        onClick={() => setStatusSort(option.id)}
                      >
                        {option.label}
                      </Button>
                    );
                  }
                )}
              </div>
              <div className='flex flex-wrap gap-2'>
                {sortedDurationByStatus.map(
                  (bucket: {
                    status: string;
                    count: number;
                    timedCount: number;
                    totalMs: number;
                    averageMs: number | null;
                    min: NodeDurationRow | null;
                    max: NodeDurationRow | null;
                  }): React.JSX.Element => {
                    const tooltipContent =
                      bucket.min || bucket.max
                        ? [
                          bucket.min
                            ? `Fastest: ${bucket.min.label} · ${formatDurationMs(
                              bucket.min.durationMs
                            )}`
                            : 'Fastest: —',
                          bucket.max
                            ? `Slowest: ${bucket.max.label} · ${formatDurationMs(
                              bucket.max.durationMs
                            )}`
                            : 'Slowest: —',
                        ].join('\n')
                        : null;
                    const chip = (
                      <div
                        key={bucket.status}
                        className='flex items-center gap-2 rounded-full border border-border/60 bg-black/30 px-3 py-1'
                      >
                        <StatusBadge
                          status={bucket.status}
                          variant={statusToVariant(bucket.status)}
                          size='sm'
                          className='font-bold'
                        />
                        <span>Avg {formatDurationMs(bucket.averageMs) ?? '—'}</span>
                        <span>Total {formatDurationMs(bucket.totalMs) ?? '—'}</span>
                        <span>Min {formatDurationMs(bucket.min?.durationMs ?? null) ?? '—'}</span>
                        <span>Max {formatDurationMs(bucket.max?.durationMs ?? null) ?? '—'}</span>
                        <span>
                          Timed {bucket.timedCount}/{bucket.count}
                        </span>
                      </div>
                    );
                    return tooltipContent ? (
                      <Tooltip key={bucket.status} content={tooltipContent}>
                        {chip}
                      </Tooltip>
                    ) : (
                      chip
                    );
                  }
                )}
              </div>
            </div>
          ) : null}
          {nodeDurationRows.length === 0 ? (
            <div className='mt-2 text-[11px] text-gray-500'>No node timing data available yet.</div>
          ) : (
            <div className='mt-2 max-h-[200px] overflow-auto space-y-2'>
              {nodeDurationRows.map((row: NodeDurationRow): React.JSX.Element => {
                return (
                  <div
                    key={row.id}
                    className='flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-black/30 px-3 py-2'
                  >
                    <div className='min-w-[180px] flex-1 text-sm text-white'>{row.label}</div>
                    <div className='flex items-center gap-2 text-[11px] text-gray-400'>
                      <StatusBadge
                        status={row.status ?? 'unknown'}
                        variant={statusToVariant(row.status)}
                        size='sm'
                        className='font-medium'
                      />
                      <span>{row.durationLabel ?? '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div>
        <div className='flex items-center justify-between'>
          <div className='text-[11px] uppercase text-gray-500'>Runtime timeline</div>
          <div className='text-[11px] text-gray-500'>{filteredTimelineItems.length} entries</div>
        </div>
        {filteredTimelineItems.length === 0 ? (
          <div className='mt-3 rounded-md border border-border bg-card/40 p-4 text-xs text-gray-400'>
            Timeline is empty for the current filters.
          </div>
        ) : (
          <div className='mt-3 max-h-[320px] overflow-auto rounded-md border border-border bg-black/20 p-4'>
            <div className='relative border-l border-border/60 pl-4'>
              {filteredTimelineItems.map((item: TimelineItem, index: number): React.JSX.Element => {
                return (
                  <div key={`${item.id}-${index}`} className='relative pb-4'>
                    <div className='absolute -left-[7px] top-2 h-2.5 w-2.5 rounded-full bg-gray-400' />
                    <div className='flex flex-wrap items-center gap-2 text-xs text-gray-300'>
                      <span className='text-[11px] text-gray-500'>
                        {item.timestamp.toLocaleString()}
                      </span>
                      <StatusBadge
                        status={item.status ?? item.kind}
                        variant={statusToVariant(item.status ?? item.kind)}
                        size='sm'
                        className='font-medium'
                      />
                      <span className='text-[11px] uppercase text-gray-500'>{item.kind}</span>
                    </div>
                    <div className='mt-1 text-sm text-white'>{item.label}</div>
                    {item.description ? (
                      <div className='text-xs text-gray-400'>{item.description}</div>
                    ) : null}
                    {item.meta ? (
                      <Alert variant='error' className='mt-2 px-2 py-1 text-[11px]'>
                        {item.meta}
                      </Alert>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {visibleSections.event ? (
        <div>
          <div className='flex items-center gap-2'>
            <div className='text-[11px] uppercase text-gray-500'>Logs</div>
            {eventsOverflow ? (
              <StatusBadge
                status={'Truncated' + (eventsBatchLimit ? ' (limit ' + eventsBatchLimit + ')' : '')}
                variant='warning'
                size='sm'
                className='font-bold'
              />
            ) : null}
          </div>
          {sortedEvents.length === 0 ? (
            <div className='mt-3 rounded-md border border-border bg-card/40 p-4 text-xs text-gray-400'>
              No logs captured for this run yet.
            </div>
          ) : (
            <div className='mt-3 max-h-[360px] overflow-auto rounded-md border border-border bg-black/20'>
              <div className='divide-y divide-border/70'>
                {sortedEvents.map((event: AiPathRunEventRecord): React.JSX.Element => {
                  const metadata = formatMetadata(event.metadata);
                  return (
                    <div key={event.id} className='p-3'>
                      <div className='flex flex-wrap items-center gap-2 text-xs text-gray-400'>
                        <span>
                          {event.createdAt ? new Date(event.createdAt).toLocaleString() : '-'}
                        </span>
                        <StatusBadge
                          status={event.level}
                          variant={levelToVariant(event.level)}
                          size='sm'
                          className='font-bold'
                        />
                      </div>
                      <div className='mt-1 text-sm text-white'>{event.message}</div>
                      {metadata ? (
                        <pre className='mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                          {metadata}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
