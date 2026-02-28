'use client';

import {
  AlertTriangle,
  Copy,
  Link2,
  Monitor,
  Server,
  Shield,
  Trash2,
  SearchIcon,
  Eye,
} from 'lucide-react';
import React, { Suspense, useMemo } from 'react';

import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import {
  SystemLogsProvider,
  useSystemLogsContext,
} from '@/features/observability/context/SystemLogsContext';
import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  SYSTEM_LOG_TRIAGE_PRESETS,
  isSystemLogPresetActive,
  resolveSystemLogPresetFilters,
  type LogTriagePreset,
  type SystemLogFilterFormValues,
} from '../lib/log-triage-presets';
import { getDocumentationTooltip } from '@/shared/lib/tooltip-engine';
import type { AiInsightRecordDto as AiInsightRecord } from '@/shared/contracts/ai-insights';
import {
  MongoIndexInfoDto as MongoIndexInfo,
  MongoCollectionIndexStatusDto as MongoCollectionIndexStatus,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';
import {
  Button,
  DynamicFilters,
  StandardDataTablePanel,
  Pagination,
  StatusBadge,
  PageLayout,
  FormSection,
  Alert,
  MetadataItem,
  Tooltip,
  CopyButton,
  Hint,
  PropertyRow,
  Card,
  type StatusVariant,
  LoadingState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { ColumnDef, Row } from '@tanstack/react-table';

const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const readContextString = (log: SystemLogRecord, key: string): string | null => {
  const value = log.context?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const getLogCategory = (log: SystemLogRecord): string | null => {
  return typeof log.category === 'string' && log.category.trim().length > 0
    ? log.category
    : readContextString(log, 'category');
};

const triagePresetIcons: Record<
  LogTriagePreset['id'],
  React.ComponentType<{ className?: string }>
> = {
  'recent-errors-24h': AlertTriangle,
  'http-500-last7d': Server,
  'client-errors-last7d': Monitor,
  'auth-anomalies-last3d': Shield,
};

function LogTriagePresets(): React.JSX.Element {
  const {
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
    handleResetFilters: onClearPreset,
  } = useSystemLogsContext();

  const values: SystemLogFilterFormValues = {
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
        handleFilterChange(key as string, value);
      }
    );
  };

  const onApplyPreset = (preset: LogTriagePreset): void => {
    const resolvedPresetValues = resolveSystemLogPresetFilters(preset);
    const nextValues: SystemLogFilterFormValues = {
      ...SYSTEM_LOG_FILTER_DEFAULTS,
      ...resolvedPresetValues,
    };
    applyFilterValues(nextValues);
  };

  const now = new Date();
  const resolvedPresets = SYSTEM_LOG_TRIAGE_PRESETS.map((preset: LogTriagePreset) => ({
    preset,
    filters: resolveSystemLogPresetFilters(preset, now),
  }));

  const activePresetId =
    resolvedPresets.find(({ filters }: { filters: Partial<SystemLogFilterFormValues> }) =>
      isSystemLogPresetActive(values, filters)
    )?.preset.id ?? null;

  return (
    <FormSection
      title='Saved Triage Presets'
      description='One-click filters for common incident investigation paths.'
      variant='subtle-compact'
      actions={
        activePresetId ? (
          <Button variant='ghost' size='sm' onClick={onClearPreset} className='h-8 text-xs'>
            Clear preset
          </Button>
        ) : null
      }
      className='p-3'
    >
      <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
        {resolvedPresets.map(({ preset }: { preset: LogTriagePreset }) => {
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
                    <div className='mt-1'>
                      <StatusBadge
                        status='Active'
                        variant='success'
                        size='sm'
                        className='font-bold h-4'
                      />
                    </div>
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
    confirmAction,
    handleRebuildMongoIndexes,
  } = useSystemLogsContext();

  const columns = useMemo<ColumnDef<MongoCollectionIndexStatus>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Collection',
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => (
          <StatusBadge
            status={row.original.name}
            variant='success'
            size='sm'
            className='font-mono'
          />
        ),
      },
      {
        accessorKey: 'expected',
        header: 'Expected',
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => (
          <span className='text-xs text-gray-400'>{row.original.expected.length}</span>
        ),
      },
      {
        accessorKey: 'missing',
        header: 'Missing',
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => {
          const missingCount = row.original.missing.length;
          if (row.original.error)
            return <StatusBadge status={row.original.error} variant='error' size='sm' />;
          if (missingCount === 0) return <span className='text-gray-600'>0</span>;
          return (
            <div className='flex flex-wrap items-center gap-1'>
              <span className='text-amber-400 font-bold mr-2'>{missingCount}</span>
              {row.original.missing.map((m: MongoIndexInfo, i: number) => (
                <StatusBadge
                  key={i}
                  status={JSON.stringify(m.key)}
                  variant='warning'
                  size='sm'
                  className='font-mono text-[9px]'
                />
              ))}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: () => <div className='text-right'>Status</div>,
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => {
          const missingCount = row.original.missing.length;
          return (
            <div className='text-right'>
              <StatusBadge
                status={
                  row.original.error ? 'Error' : missingCount === 0 ? 'Healthy' : 'Sync Required'
                }
                variant={row.original.error ? 'error' : missingCount === 0 ? 'success' : 'warning'}
                className='text-[9px]'
              />
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <StandardDataTablePanel
      title='Database Health'
      description='Mongo index consistency for observability collections.'
      headerActions={
        <div className='flex items-center gap-2'>
          {diagnosticsUpdatedAt ? (
            <Hint uppercase variant='muted' size='xs' className='font-semibold'>
              Updated {formatTimestamp(diagnosticsUpdatedAt)}
            </Hint>
          ) : null}
          <Button
            variant='outline'
            size='xs'
            onClick={() => void mongoDiagnosticsQuery.refetch()}
            disabled={mongoDiagnosticsQuery.isFetching}
          >
            Refresh
          </Button>
          <Button
            variant='outline'
            size='xs'
            onClick={() =>
              confirmAction({
                title: 'Restore Index Health',
                message:
                  'Initiate a background scan and reconstruction of missing telemetry indexes.',
                confirmText: 'Begin Rebuild',
                onConfirm: handleRebuildMongoIndexes,
              })
            }
            className='border-amber-500/20 text-amber-200 hover:bg-amber-500/5'
          >
            Rebuild Indexes
          </Button>
        </div>
      }
      variant='flat'
      columns={columns}
      data={diagnostics}
      isLoading={mongoDiagnosticsQuery.isLoading}
    />
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
        <LoadingState message='Calculating metrics...' className='py-8' size='sm' />
      ) : metrics ? (
        <div className='grid gap-4 md:grid-cols-3 mt-4'>
          <Card variant='glass' padding='md'>
            <Hint uppercase className='mb-2 font-semibold' variant='muted'>
              Retention Period
            </Hint>
            <div className='space-y-1'>
              <PropertyRow
                label='Total Logs'
                value={metrics.total}
                mono
                valueClassName='text-white'
                variant='subtle'
              />
              <PropertyRow
                label='Last 24h'
                value={metrics.last24Hours}
                mono
                valueClassName='text-white'
                variant='subtle'
              />
              <PropertyRow
                label='Last 7d'
                value={metrics.last7Days}
                mono
                valueClassName='text-white'
                variant='subtle'
              />
            </div>
          </Card>
          <Card variant='glass' padding='md'>
            <Hint uppercase className='mb-2 font-semibold' variant='muted'>
              Level Distribution
            </Hint>
            <div className='space-y-1'>
              <PropertyRow
                label='Errors'
                value={levels.error}
                mono
                labelClassName='text-rose-400'
                valueClassName='text-rose-300'
                variant='subtle'
              />
              <PropertyRow
                label='Warnings'
                value={levels.warn}
                mono
                labelClassName='text-amber-400'
                valueClassName='text-amber-300'
                variant='subtle'
              />
              <PropertyRow
                label='Info'
                value={levels.info}
                mono
                labelClassName='text-sky-400'
                valueClassName='text-sky-300'
                variant='subtle'
              />
            </div>
          </Card>
          <Card variant='glass' padding='md'>
            <Hint uppercase className='mb-2 font-semibold' variant='muted'>
              Traffic Origins
            </Hint>
            <div className='max-h-[100px] overflow-y-auto pr-2 space-y-1'>
              {metrics.topSources.map((item: { source: string; count: number }) => (
                <PropertyRow
                  key={item.source}
                  label={
                    <StatusBadge
                      status={item.source}
                      variant='neutral'
                      size='sm'
                      className='font-mono h-4'
                    />
                  }
                  value={item.count}
                  className='bg-white/5 px-2 py-1 rounded'
                  variant='subtle'
                />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className='py-8 text-center text-xs text-gray-600'>
          No metrics available for this filter set.
        </div>
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
          <LoadingState message='Consulting AI models...' className='py-4' size='sm' />
        ) : insightsQuery.data?.insights?.length ? (
          insightsQuery.data.insights.map((insight: AiInsightRecord) => (
            <Card key={insight.id} variant='glass' padding='md' className='bg-gray-950/40'>
              <div className='flex items-center justify-between mb-3'>
                <span className='text-[10px] font-mono text-gray-500 uppercase'>
                  {formatTimestamp(insight.createdAt ?? '')}
                </span>
                <StatusBadge status={insight.status} />
              </div>
              <p className='text-sm text-gray-200 leading-relaxed'>{insight.summary}</p>
              {(insight.warnings?.length ?? 0) > 0 && (
                <Alert variant='warning' className='mt-3 p-2 text-[11px] space-y-1'>
                  <span className='font-bold uppercase text-[9px] block mb-1'>
                    Advisory Warnings
                  </span>
                  {insight.warnings?.map((w, i) => (
                    <p key={i}>• {w}</p>
                  ))}
                </Alert>
              )}
            </Card>
          ))
        ) : (
          <div className='py-8 text-center text-xs text-gray-600 uppercase tracking-widest bg-black/20 rounded border border-white/5'>
            No intelligence reports available
          </div>
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
  const aiInterpretationTooltip =
    getDocumentationTooltip(
      DOCUMENTATION_MODULE_IDS.observability,
      'system_logs_ai_interpretation'
    ) ?? 'AI Interpretation';

  const columns = useMemo<ColumnDef<SystemLogRecord>[]>(
    () => [
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
        cell: ({ row }) => (
          <span className='text-xs text-gray-500 font-mono'>
            {formatTimestamp(row.original.createdAt || '')}
          </span>
        ),
      },
      {
        accessorKey: 'message',
        header: 'Event Message',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1 max-w-[500px]'>
            <Tooltip content={row.original.message} className='w-full'>
              <span className='text-sm text-gray-200 font-medium truncate block'>
                {row.original.message}
              </span>
            </Tooltip>
            {(row.original.path || row.original.method) && (
              <div className='flex items-center gap-2'>
                <span className='text-[10px] text-gray-500 font-mono'>
                  {row.original.method && (
                    <span className='text-sky-400 mr-1'>{row.original.method}</span>
                  )}
                  {row.original.path}
                </span>
                {row.original.statusCode && (
                  <StatusBadge
                    status={String(row.original.statusCode)}
                    variant={row.original.statusCode >= 400 ? 'error' : 'success'}
                    size='sm'
                    className='font-bold h-4'
                  />
                )}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.source || 'system'}
            variant='neutral'
            size='sm'
            className='font-mono uppercase'
          />
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Tools</div>,
        cell: ({ row }) => (
          <div className='flex justify-end gap-2'>
            <Tooltip content={aiInterpretationTooltip}>
              <Button
                variant='ghost'
                size='xs'
                className='h-7 w-7 p-0'
                onClick={() => interpretLogMutation.mutate(row.original.id)}
                disabled={interpretLogMutation.isPending}
              >
                <Eye className='size-3.5' />
              </Button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [aiInterpretationTooltip, interpretLogMutation]
  );

  return (
    <StandardDataTablePanel
      title='Event Stream'
      headerActions={
        <span className='text-xs text-gray-600 font-bold self-center'>{total} Total Events</span>
      }
      footer={
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} variant='compact' />
      }
      isLoading={logsQuery.isLoading}
      variant='flat'
      columns={columns}
      data={logs}
      maxHeight='60vh'
      stickyHeader
      enableVirtualization={true}
      renderRowDetails={({ row }: { row: { original: SystemLogRecord } }) => {
        const log = row.original;
        const category = getLogCategory(log);
        const fingerprint = readContextString(log, 'fingerprint');
        const errorCode = readContextString(log, 'errorCode') ?? readContextString(log, 'code');
        const errorName = readContextString(log, 'errorName') ?? readContextString(log, 'name');
        const errorId = readContextString(log, 'errorId');
        const interpretation = logInterpretations[log.id];
        return (
          <div className='p-6 bg-black/40 space-y-6 border-t border-white/5'>
            {interpretation && (
              <Alert variant='success' className='p-4'>
                <div className='flex items-center gap-2 font-bold text-[10px] uppercase mb-2'>
                  <Monitor className='size-3' />
                  AI Interpretation Output
                </div>
                <p className='text-sm text-gray-200 leading-relaxed'>{interpretation.summary}</p>
                {interpretation.warnings?.length ? (
                  <ul className='mt-3 space-y-1 border-t border-emerald-500/10 pt-2'>
                    {interpretation.warnings.map((w, i) => (
                      <li key={i} className='text-[11px] opacity-80'>
                        • {w}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Alert>
            )}

            <div className='grid gap-6 md:grid-cols-2'>
              <div className='space-y-4'>
                <div>
                  <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                    Identification
                  </Hint>
                  <div className='grid grid-cols-2 gap-2'>
                    <MetadataItem label='Request ID' value={log.requestId} mono />
                    <MetadataItem label='User ID' value={log.userId} mono />
                    <MetadataItem label='Error ID' value={errorId} mono />
                    <MetadataItem label='Category' value={category} />
                    <MetadataItem label='Error Code' value={errorCode} mono />
                    <MetadataItem label='Error Name' value={errorName} />
                    <MetadataItem label='Fingerprint' value={fingerprint} mono />
                  </div>
                </div>

                {log.stack && (
                  <div>
                    <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                      StackTrace
                    </Hint>
                    <pre className='p-3 rounded-lg bg-gray-950 border border-white/5 font-mono text-[10px] text-rose-300/80 overflow-auto max-h-[300px] whitespace-pre-wrap'>
                      {log.stack}
                    </pre>
                  </div>
                )}
              </div>

              <div>
                <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                  Payload Context
                </Hint>
                <pre className='p-3 rounded-lg bg-gray-950 border border-white/5 font-mono text-[10px] text-sky-300/80 overflow-auto max-h-[400px]'>
                  {JSON.stringify(log.context || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
      }}
    />
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
    confirmAction,
    handleClearLogs,
    clearLogsMutation,
  } = useSystemLogsContext();

  const handleDynamicFilterChange = (key: string, value: string | string[]): void => {
    handleFilterChange(key, Array.isArray(value) ? (value[0] ?? '') : value);
  };

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
          <CopyButton
            value={typeof window !== 'undefined' ? window.location.href : ''}
            variant='outline'
            size='sm'
            className='h-8'
            showText
          >
            <Link2 className='size-3.5 mr-2' />
            Sync Link
          </CopyButton>
          <CopyButton
            value={logsJson}
            variant='outline'
            size='sm'
            className='h-8'
            disabled={logs.length === 0}
            showText
          >
            <Copy className='size-3.5 mr-2' />
            Export
          </CopyButton>
          <Button
            variant='outline'
            size='xs'
            className='h-8 border-rose-500/20 text-rose-300 hover:bg-rose-500/5'
            onClick={() =>
              confirmAction({
                title: 'Wipe Observation Logs',
                message:
                  'Permanently delete all captured telemetry data. This action is irreversible.',
                confirmText: 'Confirm Wipe',
                isDangerous: true,
                onConfirm: handleClearLogs,
              })
            }
            disabled={clearLogsMutation.isPending}
          >
            <Trash2 className='size-3.5 mr-2' />
            {clearLogsMutation.isPending ? 'Purging...' : 'Wipe Logs'}
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        <LogTriagePresets />

        <Card variant='glass' padding='lg'>
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
        </Card>

        <LogDiagnostics />

        <div className='grid gap-6 lg:grid-cols-2'>
          <LogMetrics />
          <AiLogInterpreter />
        </div>

        <LogList />
      </div>
    </PageLayout>
  );
}

export default function SystemLogsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={<LoadingState message='Mounting observation post...' className='h-screen' />}
    >
      <SystemLogsProvider>
        <SystemLogsContent />
      </SystemLogsProvider>
    </Suspense>
  );
}
