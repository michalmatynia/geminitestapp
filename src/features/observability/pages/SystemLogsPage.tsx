'use client';

import { AlertTriangle, Copy, Link2, Monitor, Server, Shield, Trash2, SearchIcon, Eye } from 'lucide-react';
import React, { useMemo } from 'react';

import { SystemLogsProvider, useSystemLogsContext, type MongoCollectionIndexStatus, type MongoIndexInfo } from '@/features/observability/context/SystemLogsContext';
import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  SYSTEM_LOG_TRIAGE_PRESETS,
  isSystemLogPresetActive,
  resolveSystemLogPresetFilters,
  type LogTriagePreset,
  type SystemLogFilterFormValues,
} from '@/features/observability/lib/log-triage-presets';
import type { SystemLogRecord, AiInsightRecord } from '@/shared/types';
import { 
  Button, 
  DynamicFilters, 
  DataTable, 
  Pagination, 
  StatusBadge, 
  ConfirmDialog, 
  PageLayout, 
  FormSection,
  Badge,
  type StatusVariant
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { ColumnDef, Row } from '@tanstack/react-table';

const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const triagePresetIcons: Record<LogTriagePreset['id'], React.ComponentType<{ className?: string }>> = {
  'recent-errors-24h': AlertTriangle,
  'http-500-last7d': Server,
  'client-errors-last7d': Monitor,
  'auth-anomalies-last3d': Shield,
};

function LogTriagePresets({
  values,
  onApplyPreset,
  onClearPreset,
}: {
  values: SystemLogFilterFormValues;
  onApplyPreset: (preset: LogTriagePreset) => void;
  onClearPreset: () => void;
}): React.JSX.Element {
  const now = new Date();
  const resolvedPresets = SYSTEM_LOG_TRIAGE_PRESETS.map((preset) => ({
    preset,
    filters: resolveSystemLogPresetFilters(preset, now),
  }));

  const activePresetId =
    resolvedPresets.find(({ filters }) => isSystemLogPresetActive(values, filters))?.preset.id ??
    null;

  return (
    <FormSection
      title='Saved Triage Presets'
      description='One-click filters for common incident investigation paths.'
      variant='subtle-compact'
      actions={activePresetId ? (
        <Button variant='ghost' size='sm' onClick={onClearPreset} className='h-8 text-xs'>
          Clear preset
        </Button>
      ) : null}
      className='p-3'
    >
      <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
        {resolvedPresets.map(({ preset }) => {
          const isActive = preset.id === activePresetId;
          const Icon = triagePresetIcons[preset.id] ?? AlertTriangle;
          return (
            <Button
              key={preset.id}
              type='button'
              variant='outline'
              onClick={(): void => onApplyPreset(preset)}
              className={cn(
                'h-auto w-full justify-start px-3 py-2 text-left',
                isActive && 'border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/20'
              )}
            >
              <span className='flex items-start gap-2'>
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0 text-gray-400',
                    isActive && 'text-emerald-200'
                  )}
                />
                <span className='block'>
                  <span className='block text-xs font-semibold text-gray-100'>{preset.label}</span>
                  <span className='block text-[11px] text-gray-400'>{preset.description}</span>
                  {isActive ? (
                    <span className='mt-1 inline-flex rounded border border-emerald-400/50 px-1.5 py-0.5 text-[10px] text-emerald-200'>
                      Active
                    </span>
                  ) : null}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </FormSection>
  );
}

function LogDiagnostics(): React.JSX.Element {
  const {
    diagnostics,
    diagnosticsUpdatedAt,
    mongoDiagnosticsQuery,
    setIsRebuildIndexesConfirmOpen,
  } = useSystemLogsContext();

  const columns = useMemo<ColumnDef<MongoCollectionIndexStatus>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Collection',
      cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => <span className='font-mono text-xs text-emerald-200'>{row.original.name}</span>,
    },
    {
      accessorKey: 'expected',
      header: 'Expected',
      cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => <span className='text-xs text-gray-400'>{row.original.expected.length}</span>,
    },
    {
      accessorKey: 'missing',
      header: 'Missing',
      cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => {
        const missingCount = row.original.missing.length;
        if (row.original.error) return <span className='text-rose-400 text-[10px]'>{row.original.error}</span>;
        if (missingCount === 0) return <span className='text-gray-600'>0</span>;
        return (
          <div className='flex flex-wrap gap-1'>
            <span className='text-amber-400 font-bold mr-2'>{missingCount}</span>
            {row.original.missing.map((m: MongoIndexInfo, i: number) => (
              <Badge key={i} variant='outline' className='text-[9px] bg-amber-500/5 text-amber-300 border-amber-500/20'>
                {JSON.stringify(m.key)}
              </Badge>
            ))}
          </div>
        );
      }
    },
    {
      id: 'status',
      header: () => <div className='text-right'>Status</div>,
      cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => {
        const missingCount = row.original.missing.length;
        return (
          <div className='text-right'>
            <StatusBadge 
              status={row.original.error ? 'Error' : missingCount === 0 ? 'Healthy' : 'Sync Required'} 
              variant={row.original.error ? 'error' : missingCount === 0 ? 'success' : 'warning'} 
              className='text-[9px]' 
            />
          </div>
        );
      }
    }
  ], []);

  return (
    <FormSection
      title='Database Health'
      description='Mongo index consistency for observability collections.'
      actions={
        <div className='flex items-center gap-2'>
          <span className='text-[10px] uppercase font-bold text-gray-600'>
            {diagnosticsUpdatedAt ? `Updated ${formatTimestamp(diagnosticsUpdatedAt)}` : ''}
          </span>
          <Button variant='outline' size='xs' onClick={() => void mongoDiagnosticsQuery.refetch()} disabled={mongoDiagnosticsQuery.isFetching}>
            Refresh
          </Button>
          <Button variant='outline' size='xs' onClick={() => setIsRebuildIndexesConfirmOpen(true)} className='border-amber-500/20 text-amber-200 hover:bg-amber-500/5'>
            Rebuild Indexes
          </Button>
        </div>
      }
      className='p-6'
    >
      <div className='rounded-md border border-border bg-gray-950/20 overflow-hidden mt-4'>
        <DataTable
          columns={columns}
          data={diagnostics}
          isLoading={mongoDiagnosticsQuery.isLoading}
        />
      </div>
    </FormSection>
  );
}

function LogMetrics(): React.JSX.Element {
  const { metricsQuery, metrics, levels } = useSystemLogsContext();

  return (
    <FormSection
      title='Log Volume Metrics'
      description='Aggregated events based on current active filters.'
      actions={
        <div className='text-[10px] uppercase font-bold text-gray-600'>
          {metrics?.generatedAt ? `Generated ${formatTimestamp(metrics.generatedAt)}` : ''}
        </div>
      }
      className='p-6'
    >
      {metricsQuery.isLoading ? (
        <div className='py-8 text-center text-xs text-gray-500 animate-pulse uppercase tracking-widest'>Calculating metrics...</div>
      ) : metrics ? (
        <div className='grid gap-4 md:grid-cols-3 mt-4'>
          <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
            <p className='text-[10px] uppercase font-bold text-gray-500 mb-2'>Retention Period</p>
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between'><span className='text-gray-400'>Total Logs</span><span className='text-white font-mono'>{metrics.total}</span></div>
              <div className='flex justify-between'><span className='text-gray-400'>Last 24h</span><span className='text-white font-mono'>{metrics.last24Hours}</span></div>
              <div className='flex justify-between'><span className='text-gray-400'>Last 7d</span><span className='text-white font-mono'>{metrics.last7Days}</span></div>
            </div>
          </div>
          <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
            <p className='text-[10px] uppercase font-bold text-gray-500 mb-2'>Level Distribution</p>
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between'><span className='text-rose-400'>Errors</span><span className='text-rose-300 font-mono'>{levels.error}</span></div>
              <div className='flex justify-between'><span className='text-amber-400'>Warnings</span><span className='text-amber-300 font-mono'>{levels.warn}</span></div>
              <div className='flex justify-between'><span className='text-sky-400'>Info</span><span className='text-sky-300 font-mono'>{levels.info}</span></div>
            </div>
          </div>
          <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
            <p className='text-[10px] uppercase font-bold text-gray-500 mb-2'>Traffic Origins</p>
            <div className='max-h-[100px] overflow-y-auto pr-2 space-y-1'>
              {metrics.topSources.map((item) => (
                <div key={item.source} className='flex items-center justify-between text-[11px] bg-white/5 px-2 py-1 rounded'>
                  <span className='truncate text-gray-300 font-mono'>{item.source}</span>
                  <span className='text-gray-500'>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className='py-8 text-center text-xs text-gray-600'>No metrics available for this filter set.</div>
      )}
    </FormSection>
  );
}

function AiLogInterpreter(): React.JSX.Element {
  const { runInsightMutation, insightsQuery } = useSystemLogsContext();

  return (
    <FormSection
      title='AI Insights Engine'
      description='Deep-scan error patterns and identify root causes automatically.'
      actions={
        <Button
          variant='outline'
          size='xs'
          className='h-8'
          onClick={() => runInsightMutation.mutate()}
          disabled={runInsightMutation.isPending}
        >
          {runInsightMutation.isPending ? 'Running interpretation...' : 'Generate New Insight'}
        </Button>
      }
      className='p-6'
    >
      <div className='mt-4 space-y-3'>
        {insightsQuery.isLoading ? (
          <div className='py-4 text-center text-xs text-gray-500 animate-pulse'>Consulting AI models...</div>
        ) : insightsQuery.data?.insights?.length ? (
          insightsQuery.data.insights.map((insight: AiInsightRecord) => (
            <div key={insight.id} className='rounded-lg border border-border/60 bg-gray-950/40 p-4'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-[10px] font-mono text-gray-500 uppercase'>{formatTimestamp(insight.createdAt)}</span>
                <StatusBadge status={insight.status} />
              </div>
              <p className='text-sm text-gray-200 leading-relaxed'>{insight.summary}</p>
              {insight.warnings.length > 0 && (
                <div className='mt-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded text-[11px] text-amber-200 space-y-1'>
                  <span className='font-bold uppercase text-[9px] block mb-1'>Advisory Warnings</span>
                  {insight.warnings.map((w, i) => <p key={i}>• {w}</p>)}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className='py-8 text-center text-xs text-gray-600 uppercase tracking-widest bg-black/20 rounded border border-white/5'>No intelligence reports available</div>
        )}
      </div>
    </FormSection>
  );
}

function LogList(): React.JSX.Element {
  const {
    logsQuery,
    logs,
    total,
    totalPages,
    page,
    setPage,
    interpretLogMutation,
    logInterpretations,
  } = useSystemLogsContext();

  const columns = useMemo<ColumnDef<SystemLogRecord>[]>(() => [
    {
      accessorKey: 'level',
      header: 'Level',
              cell: ({ row }) => {
                const level = row.original.level.toLowerCase();
                const variantMap: Record<string, StatusVariant> = {
                  error: 'error',
                  warn: 'warning',
                  info: 'info',
                  debug: 'neutral',
                };
                return (
                  <StatusBadge
                    status={row.original.level}
                    variant={variantMap[level] || 'neutral'}
                    className='text-[9px]'
                  />
                );
              },
      
    },
    {
      accessorKey: 'createdAt',
      header: 'Timestamp',
      cell: ({ row }) => <span className='text-xs text-gray-500 font-mono'>{formatTimestamp(row.original.createdAt)}</span>,
    },
    {
      accessorKey: 'message',
      header: 'Event Message',
      cell: ({ row }) => (
        <div className='flex flex-col gap-1 max-w-[500px]'>
          <span className='text-sm text-gray-200 font-medium truncate' title={row.original.message}>{row.original.message}</span>
          {(row.original.path || row.original.method) && (
            <span className='text-[10px] text-gray-500 font-mono'>
              {row.original.method && <span className='text-sky-400 mr-1'>{row.original.method}</span>}
              {row.original.path}
              {row.original.statusCode && <span className='ml-2 text-amber-400'>• {row.original.statusCode}</span>}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => <Badge variant='outline' className='text-[9px] font-mono text-gray-400 uppercase'>{row.original.source || 'system'}</Badge>,
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Tools</div>,
      cell: ({ row }) => (
        <div className='flex justify-end gap-2'>
          <Button
            variant='ghost'
            size='xs'
            className='h-7 w-7 p-0'
            onClick={() => interpretLogMutation.mutate(row.original.id)}
            disabled={interpretLogMutation.isPending}
            title='AI Interpretation'
          >
            <Eye className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ], [interpretLogMutation]);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between px-2'>
        <h3 className='text-xs font-semibold uppercase tracking-widest text-gray-500'>Event Stream</h3>
        <div className='flex items-center gap-4'>
          <span className='text-xs text-gray-600 font-bold'>{total} Total Events</span>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            variant='compact'
          />
        </div>
      </div>

              <div className='rounded-md border border-border bg-gray-950/20 overflow-hidden'>

                <DataTable

                  columns={columns}

                  data={logs}

                  isLoading={logsQuery.isLoading}

                  maxHeight='60vh'

                  stickyHeader

                  renderRowDetails={({ row }: { row: { original: SystemLogRecord } }) => {

      
            const log = row.original;
            const interpretation = logInterpretations[log.id];
            return (
              <div className='p-6 bg-black/40 space-y-6 border-t border-white/5'>
                {interpretation && (
                  <div className='p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20'>
                    <div className='flex items-center gap-2 text-emerald-300 font-bold text-[10px] uppercase mb-2'>
                      <Monitor className='size-3' />
                      AI Interpretation Output
                    </div>
                    <p className='text-sm text-gray-200 leading-relaxed'>{interpretation.summary}</p>
                    {interpretation.warnings?.length ? (
                      <ul className='mt-3 space-y-1 border-t border-emerald-500/10 pt-2'>
                        {interpretation.warnings.map((w, i) => <li key={i} className='text-[11px] text-emerald-400/80'>• {w}</li>)}
                      </ul>
                    ) : null}
                  </div>
                )}

                <div className='grid gap-6 md:grid-cols-2'>
                  <div className='space-y-4'>
                    <div>
                      <h4 className='text-[10px] uppercase font-bold text-gray-600 mb-2'>Identification</h4>
                      <div className='grid grid-cols-2 gap-2 text-xs'>
                        <div className='p-2 rounded bg-white/5 border border-white/5'>
                          <span className='block text-gray-500 text-[9px] uppercase'>Request ID</span>
                          <span className='font-mono text-gray-300'>{log.requestId || '—'}</span>
                        </div>
                        <div className='p-2 rounded bg-white/5 border border-white/5'>
                          <span className='block text-gray-500 text-[9px] uppercase'>User ID</span>
                          <span className='font-mono text-gray-300'>{log.userId || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {log.stack && (
                      <div>
                        <h4 className='text-[10px] uppercase font-bold text-gray-600 mb-2'>StackTrace</h4>
                        <pre className='p-3 rounded-lg bg-gray-950 border border-white/5 font-mono text-[10px] text-rose-300/80 overflow-auto max-h-[300px] whitespace-pre-wrap'>
                          {log.stack}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className='text-[10px] uppercase font-bold text-gray-600 mb-2'>Payload Context</h4>
                    <pre className='p-3 rounded-lg bg-gray-950 border border-white/5 font-mono text-[10px] text-sky-300/80 overflow-auto max-h-[400px]'>
                      {JSON.stringify(log.context || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

function SystemLogsContent(): React.JSX.Element {
  const {
    filterFields,
    level,
    query,
    source,
    method,
    statusCode,
    requestId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
    handleFilterChange,
    handleResetFilters,
    logs,
    logsJson,
    logsQuery,
    metricsQuery,
    isClearLogsConfirmOpen,
    setIsClearLogsConfirmOpen,
    isRebuildIndexesConfirmOpen,
    setIsRebuildIndexesConfirmOpen,
    handleClearLogs,
    handleRebuildMongoIndexes,
    clearLogsMutation,
    toast,
  } = useSystemLogsContext();

  const currentFilterValues: SystemLogFilterFormValues = {
    level,
    query,
    source,
    method,
    statusCode,
    requestId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
  };

  const applyFilterValues = (nextValues: SystemLogFilterFormValues): void => {
    (Object.entries(nextValues) as Array<[keyof SystemLogFilterFormValues, string]>).forEach(
      ([key, value]) => {
        handleFilterChange(key, value);
      }
    );
  };

  const handleDynamicFilterChange = (key: string, value: string | string[]): void => {
    handleFilterChange(key, Array.isArray(value) ? (value[0] ?? '') : value);
  };

  const handleApplyPreset = (preset: LogTriagePreset): void => {
    const resolvedPresetValues = resolveSystemLogPresetFilters(preset);
    const nextValues: SystemLogFilterFormValues = {
      ...SYSTEM_LOG_FILTER_DEFAULTS,
      ...resolvedPresetValues,
    };
    applyFilterValues(nextValues);
  };

  return (
    <PageLayout
      title='Observation Post'
      description='Aggregate telemetry and event logging across all platform components.'
      refresh={{
        onRefresh: (): void => {
          void logsQuery.refetch();
          void metricsQuery.refetch();
        },
        isRefreshing: logsQuery.isFetching || metricsQuery.isFetching,
      }}
      headerActions={
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='xs'
            className='h-8'
            onClick={() => window.location.assign('/admin/settings/logging')}
          >
            Settings
          </Button>
          <Button
            variant='outline'
            size='xs'
            className='h-8'
            onClick={(): void => {
              if (typeof window === 'undefined') return;
              void navigator.clipboard
                .writeText(window.location.href)
                .then(() => {
                  toast('Telemetry session link copied', { variant: 'success' });
                });
            }}
          >
            <Link2 className='size-3.5 mr-2' />
            Sync Link
          </Button>
          <Button
            variant='outline'
            size='xs'
            className='h-8'
            disabled={logs.length === 0}
            onClick={(): void => {
              void navigator.clipboard.writeText(logsJson).then(() => {
                toast('JSON Exported to clipboard', { variant: 'success' });
              });
            }}
          >
            <Copy className='size-3.5 mr-2' />
            Export
          </Button>
          <Button
            variant='outline'
            size='xs'
            className='h-8 border-rose-500/20 text-rose-300 hover:bg-rose-500/5'
            onClick={() => setIsClearLogsConfirmOpen(true)}
            disabled={clearLogsMutation.isPending}
          >
            <Trash2 className='size-3.5 mr-2' />
            {clearLogsMutation.isPending ? 'Purging...' : 'Wipe Logs'}
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        <LogTriagePresets
          values={currentFilterValues}
          onApplyPreset={handleApplyPreset}
          onClearPreset={handleResetFilters}
        />

        <div className='rounded-lg border border-border/60 bg-card/40 p-6'>
          <div className='flex items-center gap-2 mb-6 text-xs font-bold uppercase text-gray-500'>
            <SearchIcon className='size-3.5' />
            Log Filters
          </div>
          <DynamicFilters
            fields={filterFields}
            values={currentFilterValues}
            onChange={handleDynamicFilterChange}
            onReset={handleResetFilters}
            hasActiveFilters={Boolean(
              level !== 'all' ||
              query ||
              source ||
              method ||
              statusCode ||
              requestId ||
              userId ||
              fingerprint ||
              category ||
              fromDate ||
              toDate
            )}
            gridClassName='md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
          />
        </div>

        <LogDiagnostics />

        <div className='grid gap-6 lg:grid-cols-2'>
          <LogMetrics />
          <AiLogInterpreter />
        </div>

        <LogList />
      </div>

      <ConfirmDialog
        open={isClearLogsConfirmOpen}
        onOpenChange={setIsClearLogsConfirmOpen}
        onConfirm={(): void => { void handleClearLogs(); }}
        title='Wipe Observation Logs'
        description='Permanently delete all captured telemetry data. This action is irreversible.'
        confirmText='Confirm Wipe'
        variant='destructive'
      />
      
      <ConfirmDialog
        open={isRebuildIndexesConfirmOpen}
        onOpenChange={setIsRebuildIndexesConfirmOpen}
        onConfirm={(): void => { void handleRebuildMongoIndexes(); }}
        title='Restore Index Health'
        description='Initiate a background scan and reconstruction of missing telemetry indexes.'
        confirmText='Begin Rebuild'
      />
    </PageLayout>
  );
}

export default function SystemLogsPage(): React.JSX.Element {
  return (
    <SystemLogsProvider>
      <SystemLogsContent />
    </SystemLogsProvider>
  );
}
