'use client';

import { RefreshCcwIcon } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { Badge, Button, Card, Skeleton } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type TrendSnapshot = {
  at: string;
  trigger: 'manual' | 'threshold';
  usageTotals: { uses: number };
  sinkTotals: { writesFailed: number; writesAttempted: number };
  driftAlerts: Array<unknown>;
};

type TrendSnapshotsPayload = {
  snapshotCount: number;
  summary: {
    latestSnapshotAt: string | null;
    driftAlertsTotal: number;
    sinkWritesFailedTotal: number;
  };
  runExecution?: {
    source: 'in_memory' | 'unavailable';
    totals: {
      attempts: number;
      successes: number;
      failures: number;
      successRate: number;
      failureRate: number;
    };
    failureStageCounts: {
      resolve: number;
      validation: number;
      runtime: number;
    };
    topFailureErrors: Array<{ reason: string; count: number }>;
    recentFailures: Array<{
      at: string;
      runner: 'client' | 'server';
      surface: 'canvas' | 'product' | 'api';
      source: 'portable_package' | 'portable_envelope' | 'semantic_canvas' | 'path_config' | null;
      stage: 'resolve' | 'validation' | 'runtime';
      error: string;
      durationMs: number;
      validateBeforeRun: boolean;
      validationMode: string | null;
    }>;
  };
  snapshots: TrendSnapshot[];
};

const TREND_SNAPSHOT_LIMIT = 12;
const portableEngineOutlineBadgeClassName = 'border-white/10 text-gray-300';
const portableEngineInfoPanelClassName =
  'rounded-md border border-border/60 bg-black/20 p-2 text-xs text-gray-300';

const formatTimestamp = (value: string | null): string => {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatPercent = (value: number): string => `${Math.round(value)}%`;

type PortableEngineInfoPanelProps = {
  children: React.ReactNode;
  className?: string;
};

type PortableEngineMutedLineProps = {
  children: React.ReactNode;
  className?: string;
};

type PortableEngineSummaryBadgeConfig = {
  key: string;
  label: React.ReactNode;
};

type PortableEngineReasonCountEntry = {
  reason: string;
  count: number;
};

type PortableEngineReasonBadgeListProps = {
  entries: PortableEngineReasonCountEntry[];
  emptyMessage: string;
  maxItems?: number;
};

type PortableEngineRecordCardProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  stacked?: boolean;
};

function PortableEngineInfoPanel(props: PortableEngineInfoPanelProps): React.JSX.Element {
  const { children, className } = props;
  return <div className={cn(portableEngineInfoPanelClassName, className)}>{children}</div>;
}

function PortableEngineMutedLine(props: PortableEngineMutedLineProps): React.JSX.Element {
  const { children, className } = props;
  return <div className={cn('mt-1 text-gray-400', className)}>{children}</div>;
}

function PortableEngineReasonBadgeList({
  entries,
  emptyMessage,
  maxItems,
}: PortableEngineReasonBadgeListProps): React.JSX.Element {
  const visibleEntries = typeof maxItems === 'number' ? entries.slice(0, maxItems) : entries;

  if (visibleEntries.length === 0) {
    return <PortableEngineMutedLine>{emptyMessage}</PortableEngineMutedLine>;
  }

  return (
    <div className='mt-1 flex flex-wrap gap-1.5'>
      {visibleEntries.map((entry) => (
        <Badge
          key={entry.reason}
          variant='outline'
          className={portableEngineOutlineBadgeClassName}
        >
          {entry.reason} ({entry.count})
        </Badge>
      ))}
    </div>
  );
}

function renderPortableEngineRecordCard({
  title,
  description,
  className,
  titleClassName,
  descriptionClassName,
  stacked = false,
}: PortableEngineRecordCardProps): React.JSX.Element {
  if (stacked) {
    return (
      <div
        className={cn(
          'rounded-md border border-border/50 bg-black/20 px-3 py-2 text-xs text-gray-300',
          className
        )}
      >
        <div className={cn('font-medium text-gray-200', titleClassName)}>{title}</div>
        <PortableEngineMutedLine className={descriptionClassName}>{description}</PortableEngineMutedLine>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded border border-border/40 bg-black/30 px-2 py-1 text-[11px] text-gray-300',
        className
      )}
    >
      <span className={cn('font-medium text-gray-200', titleClassName)}>{title}</span>{' '}
      <span className={descriptionClassName}>{description}</span>
    </div>
  );
}

export function PortableEngineTrendSnapshotsPanel(): React.JSX.Element {
  const [data, setData] = useState<TrendSnapshotsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshots = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ai-paths/portable-engine/trend-snapshots?limit=${TREND_SNAPSHOT_LIMIT}`,
        {
          method: 'GET',
          cache: 'no-store',
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to load trend snapshots (${response.status}).`);
      }
      const payload = (await response.json()) as TrendSnapshotsPayload;
      setData(payload);
    } catch (cause) {
      logClientError(cause);
      setError(cause instanceof Error ? cause.message : 'Failed to load trend snapshots.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const latestSnapshots = useMemo(() => (data?.snapshots ?? []).slice(-6).reverse(), [data]);
  const runExecution = data?.runExecution ?? {
    source: 'unavailable' as const,
    totals: {
      attempts: 0,
      successes: 0,
      failures: 0,
      successRate: 0,
      failureRate: 0,
    },
    failureStageCounts: {
      resolve: 0,
      validation: 0,
      runtime: 0,
    },
    topFailureErrors: [] as Array<{ reason: string; count: number }>,
    recentFailures: [] as Array<{
      at: string;
      runner: 'client' | 'server';
      surface: 'canvas' | 'product' | 'api';
      source: 'portable_package' | 'portable_envelope' | 'semantic_canvas' | 'path_config' | null;
      stage: 'resolve' | 'validation' | 'runtime';
      error: string;
      durationMs: number;
      validateBeforeRun: boolean;
      validationMode: string | null;
    }>,
  };
  const summaryBadges: PortableEngineSummaryBadgeConfig[] = [
    {
      key: 'snapshots',
      label: <>snapshots {data?.snapshotCount ?? 0}</>,
    },
    {
      key: 'drift-alerts',
      label: <>drift alerts {data?.summary.driftAlertsTotal ?? 0}</>,
    },
    {
      key: 'sink-failures',
      label: <>sink failures {data?.summary.sinkWritesFailedTotal ?? 0}</>,
    },
    {
      key: 'run-failures',
      label: <>run failures {runExecution.totals.failures}</>,
    },
  ];

  return (
    <Card variant='subtle' className='border-border/60 bg-card/40 p-3 sm:p-4'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <p className='text-sm font-semibold text-gray-100'>Portable Engine Trend Snapshots</p>
          <p className='text-xs text-gray-400'>
            Signing policy drift, sink failures, and runtime telemetry.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            size='xs'
            variant='outline'
            onClick={() => {
              void loadSnapshots();
            }}
            disabled={isLoading}
          >
            <RefreshCcwIcon className='mr-1.5 size-3.5' />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className='space-y-2'>
          <Skeleton className='h-4 w-2/3' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
        </div>
      ) : null}

      {error ? (
        <div className='rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200'>
          {error}
        </div>
      ) : null}

      {data ? (
        <div className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            {summaryBadges.map((badge) => (
              <Badge
                key={badge.key}
                variant='outline'
                className={portableEngineOutlineBadgeClassName}
              >
                {badge.label}
              </Badge>
            ))}
          </div>

          <PortableEngineInfoPanel>
            Latest snapshot: {formatTimestamp(data.summary.latestSnapshotAt)} | drift alerts:{' '}
            {data.summary.driftAlertsTotal} | sink write failures: {data.summary.sinkWritesFailedTotal}{' '}
            | runtime failures: {runExecution.totals.failures}
          </PortableEngineInfoPanel>

          <PortableEngineInfoPanel>
            <div className='font-medium text-gray-200'>Run execution telemetry</div>
            <PortableEngineMutedLine>
              source={runExecution.source} attempts={runExecution.totals.attempts} success=
              {formatPercent(runExecution.totals.successRate)} failure=
              {formatPercent(runExecution.totals.failureRate)} stage(
              {runExecution.failureStageCounts.resolve}/{runExecution.failureStageCounts.validation}
              /{runExecution.failureStageCounts.runtime})
            </PortableEngineMutedLine>
            <PortableEngineReasonBadgeList
              entries={runExecution.topFailureErrors}
              maxItems={4}
              emptyMessage='No recent runtime failures captured.'
            />
            {runExecution.recentFailures.length > 0 ? (
              <div className='mt-2 space-y-1'>
                {runExecution.recentFailures.slice(0, 3).map((entry) => (
                  <Fragment key={`${entry.at}-${entry.runner}-${entry.stage}-${entry.error}`}>
                    {renderPortableEngineRecordCard({
                      title: `${entry.runner}/${entry.surface}/${entry.stage}`,
                      description: `· ${entry.error} · ${entry.durationMs}ms · ${formatTimestamp(entry.at)}`,
                    })}
                  </Fragment>
                ))}
              </div>
            ) : null}
          </PortableEngineInfoPanel>

          {latestSnapshots.length === 0 ? (
            <p className='text-xs text-gray-400'>No snapshots captured yet.</p>
          ) : (
            <div className='space-y-2'>
              {latestSnapshots.map((snapshot) => (
                <Fragment key={`${snapshot.at}-${snapshot.trigger}`}>
                  {renderPortableEngineRecordCard({
                    title: formatTimestamp(snapshot.at),
                    description: `trigger=${snapshot.trigger} uses=${snapshot.usageTotals.uses} driftAlerts=${snapshot.driftAlerts.length} sinkFailed=${snapshot.sinkTotals.writesFailed}/${snapshot.sinkTotals.writesAttempted}`,
                    stacked: true,
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
