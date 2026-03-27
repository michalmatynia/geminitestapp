'use client';

import React from 'react';

import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/lib/ai-paths';
import { formatDurationMs } from '@/shared/lib/ai-paths';
import type { StatusVariant } from '@/shared/contracts/ui';
import { Button, Tooltip, StatusBadge, Alert } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  buildRuntimeDurationRows,
  buildRuntimeTimelineItems,
  type RuntimeTraceDurationRow,
  type RuntimeTraceTimelineItem,
} from './run-trace-utils';
import { renderRuntimeEventEntry } from './runtime-event-entry';

type TimelineFilter = 'run' | 'node' | 'event';

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

const formatMetadata = (metadata?: Record<string, unknown> | null): string | null => {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  try {
    return JSON.stringify(metadata, null, 2);
  } catch (error: unknown) {
    logClientError(error);
    return error instanceof Error ? error.message : String(error);
  }
};

function RunTimelineControlButton(props: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const { children, active = false, onClick } = props;

  return (
    <Button
      type='button'
      className={cn(
        'rounded-md border px-2 py-1 text-[10px]',
        active ? 'border-emerald-500/50 text-emerald-200' : 'text-gray-300 hover:bg-muted/60'
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function RunTimelineEmptyState({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className='mt-3 rounded-md border border-border bg-card/40 p-4 text-xs text-gray-400'>
      {children}
    </div>
  );
}

function RunTimelineExtremaStat(props: {
  prefix: 'Fastest' | 'Slowest';
  label: 'Min' | 'Max';
  row: RuntimeTraceDurationRow | null;
  valueMs: number | null;
}): React.JSX.Element {
  const { prefix, label, row, valueMs } = props;

  if (!row) {
    return <span>{label} —</span>;
  }

  const tooltipLabel = `${prefix}: ${row.label} · ${formatDurationMs(row.durationMs)}`;

  return (
    <Tooltip content={tooltipLabel}>
      <button
        type='button'
        className='cursor-help rounded-sm bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
        aria-label={tooltipLabel}
        title={tooltipLabel}
      >
        {label} {formatDurationMs(valueMs) ?? '—'}
      </button>
    </Tooltip>
  );
}

export function RunTimeline(props: {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
  eventsOverflow?: boolean;
  eventsBatchLimit?: number | null;
}): React.JSX.Element {
  const { run, nodes, events, eventsOverflow, eventsBatchLimit } = props;

  const timelineItems = React.useMemo(
    (): RuntimeTraceTimelineItem[] => buildRuntimeTimelineItems(run, nodes),
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
      } catch (error) {
        logClientError(error);
        return { run: true, node: true, event: true };
      }
    }
  );

  React.useEffect((): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(visibleSections));
  }, [visibleSections]);

  const filteredTimelineItems = React.useMemo(
    (): RuntimeTraceTimelineItem[] =>
      timelineItems.filter((item: RuntimeTraceTimelineItem): boolean => visibleSections[item.kind]),
    [timelineItems, visibleSections]
  );

  const runEntryCount = React.useMemo(
    (): number =>
      timelineItems.filter((item: RuntimeTraceTimelineItem): boolean => item.kind === 'run').length,
    [timelineItems]
  );

  const nodeEntryCount = React.useMemo(
    (): number =>
      timelineItems.filter((item: RuntimeTraceTimelineItem): boolean => item.kind === 'node')
        .length,
    [timelineItems]
  );

  const nodeDurationRows = React.useMemo<RuntimeTraceDurationRow[]>(
    (): RuntimeTraceDurationRow[] => buildRuntimeDurationRows(run, nodes),
    [run, nodes]
  );
  const traceBackedDurations = React.useMemo(
    (): boolean => nodeDurationRows.some((row) => row.source === 'trace'),
    [nodeDurationRows]
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
      .map((row: RuntimeTraceDurationRow): number | null => row.durationMs)
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
    min: RuntimeTraceDurationRow | null;
    max: RuntimeTraceDurationRow | null;
  }> => {
    const buckets = new Map<
      string,
      {
        count: number;
        timedCount: number;
        totalMs: number;
        min: RuntimeTraceDurationRow | null;
        max: RuntimeTraceDurationRow | null;
      }
    >();
    nodeDurationRows.forEach((row: RuntimeTraceDurationRow): void => {
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
          min: RuntimeTraceDurationRow | null;
          max: RuntimeTraceDurationRow | null;
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
    min: RuntimeTraceDurationRow | null;
    max: RuntimeTraceDurationRow | null;
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
    min: RuntimeTraceDurationRow | null;
    max: RuntimeTraceDurationRow | null;
  } => {
    const timed = nodeDurationRows.filter(
      (row: RuntimeTraceDurationRow): boolean => typeof row.durationMs === 'number'
    );
    if (timed.length === 0) {
      return { min: null, max: null };
    }
    let min: RuntimeTraceDurationRow = timed[0]!;
    let max: RuntimeTraceDurationRow = timed[0]!;
    timed.forEach((row: RuntimeTraceDurationRow): void => {
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
          <RunTimelineControlButton
            onClick={() => {
              setVisibleSections({ run: true, node: true, event: true });
              setStatusSort('count');
            }}
          >
            Restore defaults
          </RunTimelineControlButton>
          <RunTimelineControlButton
            onClick={() => setVisibleSections({ run: true, node: true, event: true })}
          >
            Filters only
          </RunTimelineControlButton>
          {[
            { id: 'run', label: `Run (${runEntryCount})` },
            { id: 'node', label: `Nodes (${nodeEntryCount})` },
            { id: 'event', label: `Events (${sortedEvents.length})` },
          ].map((filter: { id: string; label: string }): React.JSX.Element => {
            const active = visibleSections[filter.id as TimelineFilter];
            return (
              <RunTimelineControlButton
                key={filter.id}
                active={active}
                onClick={() => toggleSection(filter.id as TimelineFilter)}
              >
                {filter.label}
              </RunTimelineControlButton>
            );
          })}
        </div>
      </div>

      {visibleSections.node ? (
        <div className='rounded-md border border-border/70 bg-black/20 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500'>
            <span className='uppercase'>
              {traceBackedDurations ? 'Trace span duration summary' : 'Node duration summary'}
            </span>
            <span>
              {nodeDurationRows.length} {traceBackedDurations ? 'spans' : 'nodes'}
            </span>
          </div>
          <div className='mt-1 text-[11px] text-gray-500'>
            Total {formatDurationMs(durationStats.total) ?? '—'} · Avg{' '}
            {formatDurationMs(durationStats.average) ?? '—'} · <RunTimelineExtremaStat
              prefix='Fastest'
              label='Min'
              row={minMaxNodeDuration.min}
              valueMs={durationStats.min}
            />{' '}
            ·{' '}
            <RunTimelineExtremaStat
              prefix='Slowest'
              label='Max'
              row={minMaxNodeDuration.max}
              valueMs={durationStats.max}
            />{' '}
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
                      <RunTimelineControlButton
                        key={option.id}
                        active={active}
                        onClick={() => setStatusSort(option.id)}
                      >
                        {option.label}
                      </RunTimelineControlButton>
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
                    min: RuntimeTraceDurationRow | null;
                    max: RuntimeTraceDurationRow | null;
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
            <div className='mt-2 text-[11px] text-gray-500'>
              {traceBackedDurations
                ? 'No trace span timing data available yet.'
                : 'No node timing data available yet.'}
            </div>
          ) : (
            <div className='mt-2 max-h-[200px] overflow-auto space-y-2'>
              {nodeDurationRows.map((row: RuntimeTraceDurationRow): React.JSX.Element => {
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
                      <span>{formatDurationMs(row.durationMs) ?? '—'}</span>
                      <span className='uppercase text-gray-500'>{row.source}</span>
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
          <RunTimelineEmptyState>Timeline is empty for the current filters.</RunTimelineEmptyState>
        ) : (
          <div className='mt-3 max-h-[320px] overflow-auto rounded-md border border-border bg-black/20 p-4'>
            <div className='relative border-l border-border/60 pl-4'>
              {filteredTimelineItems.map(
                (item: RuntimeTraceTimelineItem, index: number): React.JSX.Element => {
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
                        <span className='text-[11px] uppercase text-gray-500'>{item.source}</span>
                      </div>
                      <div className='mt-1 text-sm text-white'>{item.label}</div>
                      {item.description ? (
                        <div className='text-xs text-gray-400'>{item.description}</div>
                      ) : null}
                      {item.details && item.details.length > 0 ? (
                        <div className='mt-2 flex flex-wrap gap-1.5 text-[10px] text-gray-300'>
                          {item.details.map((detail: string) => (
                            <span
                              key={`${item.id}-${detail}`}
                              className='rounded-full border border-border/50 bg-black/20 px-2 py-px font-mono'
                            >
                              {detail}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {item.meta ? (
                        <Alert variant='error' className='mt-2 px-2 py-1 text-[11px]'>
                          {item.meta}
                        </Alert>
                      ) : null}
                    </div>
                  );
                }
              )}
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
            <RunTimelineEmptyState>No logs captured for this run yet.</RunTimelineEmptyState>
          ) : (
            <div className='mt-3 max-h-[360px] overflow-auto rounded-md border border-border bg-black/20'>
              <div className='divide-y divide-border/70'>
                {sortedEvents.map((event: AiPathRunEventRecord): React.JSX.Element => {
                  const metadata = formatMetadata(event.metadata);
                  return (
                    <React.Fragment key={event.id}>
                      {renderRuntimeEventEntry({
                        timestamp: event.createdAt ? new Date(event.createdAt).toLocaleString() : '-',
                        level: event.level,
                        kind: null,
                        message: event.message,
                        className: 'p-3',
                        timeClassName: 'text-gray-400',
                        levelClassName: 'font-bold',
                        messageClassName: 'text-sm text-white',
                        stacked: true,
                        hideKindBadge: true,
                        details: metadata ? (
                          <pre className='mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                            {metadata}
                          </pre>
                        ) : null,
                      })}
                    </React.Fragment>
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
