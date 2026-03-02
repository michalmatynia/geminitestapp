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
} from '@/shared/lib/observability/log-triage-presets';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const readRecordString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const readRecordNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

type AiPathRunDisplayModel = {
  nodeId: string | null;
  modelId: string | null;
  status: string | null;
  errorMessage: string | null;
};

type AiPathRunDisplayNode = {
  nodeId: string | null;
  status: string | null;
  errorMessage: string | null;
};

type AiPathRunDisplayEvent = {
  createdAt: string | null;
  level: string | null;
  message: string | null;
};

type AiPathRunDisplay = {
  runId: string | null;
  pathName: string | null;
  status: string | null;
  entityType: string | null;
  entityId: string | null;
  triggerEvent: string | null;
  triggerNodeId: string | null;
  runtimeFingerprint: string | null;
  summary: Record<string, number> | null;
  executedModels: AiPathRunDisplayModel[];
  failedNodes: AiPathRunDisplayNode[];
  recentErrorEvents: AiPathRunDisplayEvent[];
};

type AlertEvidenceSampleDisplay = {
  logId: string | null;
  createdAt: string | null;
  level: string | null;
  source: string | null;
  message: string | null;
  fingerprint: string | null;
  runId: string | null;
  jobId: string | null;
  aiPathRun: {
    runId: string | null;
    pathName: string | null;
    status: string | null;
    modelIds: string[];
    failedNodeIds: string[];
    latestErrorMessage: string | null;
  } | null;
};

type AlertEvidenceDisplay = {
  matchedCount: number | null;
  sampleSize: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  lastObservedLog: AlertEvidenceSampleDisplay | null;
  samples: AlertEvidenceSampleDisplay[];
};

const getStatusVariant = (status: string | null | undefined): StatusVariant => {
  const normalized = (status ?? '').toLowerCase();
  if (['completed', 'cached', 'success', 'healthy'].includes(normalized)) return 'success';
  if (['warn', 'warning', 'blocked', 'skipped'].includes(normalized)) return 'warning';
  if (['failed', 'error', 'fatal', 'timeout', 'cancelled', 'canceled'].includes(normalized)) {
    return 'error';
  }
  if (['info', 'running'].includes(normalized)) return 'info';
  return 'neutral';
};

const readAiPathRunStaticContext = (log: SystemLogRecord): AiPathRunDisplay | null => {
  const context = asRecord(log.context);
  const staticContext = asRecord(context?.['staticContext']);
  const aiPathRun = asRecord(staticContext?.['aiPathRun']);
  if (!aiPathRun) return null;

  const summaryRecord = asRecord(aiPathRun['summary']);
  const executedModels = Array.isArray(aiPathRun['executedModels']) ? aiPathRun['executedModels'] : [];
  const failedNodes = Array.isArray(aiPathRun['failedNodes']) ? aiPathRun['failedNodes'] : [];
  const recentErrorEvents = Array.isArray(aiPathRun['recentErrorEvents'])
    ? aiPathRun['recentErrorEvents']
    : [];

  return {
    runId: readRecordString(aiPathRun['runId']),
    pathName: readRecordString(aiPathRun['pathName']),
    status: readRecordString(aiPathRun['status']),
    entityType: readRecordString(aiPathRun['entityType']),
    entityId: readRecordString(aiPathRun['entityId']),
    triggerEvent: readRecordString(aiPathRun['triggerEvent']),
    triggerNodeId: readRecordString(aiPathRun['triggerNodeId']),
    runtimeFingerprint: readRecordString(aiPathRun['runtimeFingerprint']),
    summary: summaryRecord
      ? Object.fromEntries(
          Object.entries(summaryRecord)
            .map(([key, value]) => [key, readRecordNumber(value)])
            .filter((entry): entry is [string, number] => entry[1] !== null)
        )
      : null,
    executedModels: executedModels
      .map((value): AiPathRunDisplayModel => {
        const record = asRecord(value);
        return {
          nodeId: readRecordString(record?.['nodeId']),
          modelId: readRecordString(record?.['modelId']),
          status: readRecordString(record?.['status']),
          errorMessage: readRecordString(record?.['errorMessage']),
        };
      })
      .slice(0, 4),
    failedNodes: failedNodes
      .map((value): AiPathRunDisplayNode => {
        const record = asRecord(value);
        return {
          nodeId: readRecordString(record?.['nodeId']),
          status: readRecordString(record?.['status']),
          errorMessage: readRecordString(record?.['errorMessage']),
        };
      })
      .slice(0, 4),
    recentErrorEvents: recentErrorEvents
      .map((value): AiPathRunDisplayEvent => {
        const record = asRecord(value);
        return {
          createdAt: readRecordString(record?.['createdAt']),
          level: readRecordString(record?.['level']),
          message: readRecordString(record?.['message']),
        };
      })
      .slice(0, 4),
  };
};

const readAlertEvidenceSample = (value: unknown): AlertEvidenceSampleDisplay | null => {
  const record = asRecord(value);
  if (!record) return null;

  const aiPathRun = asRecord(record['aiPathRun']);
  const modelIds = Array.isArray(aiPathRun?.['modelIds']) ? aiPathRun?.['modelIds'] : [];
  const failedNodeIds = Array.isArray(aiPathRun?.['failedNodeIds']) ? aiPathRun?.['failedNodeIds'] : [];

  return {
    logId: readRecordString(record['logId']),
    createdAt: readRecordString(record['createdAt']),
    level: readRecordString(record['level']),
    source: readRecordString(record['source']),
    message: readRecordString(record['message']),
    fingerprint: readRecordString(record['fingerprint']),
    runId: readRecordString(record['runId']),
    jobId: readRecordString(record['jobId']),
    aiPathRun: aiPathRun
      ? {
          runId: readRecordString(aiPathRun['runId']),
          pathName: readRecordString(aiPathRun['pathName']),
          status: readRecordString(aiPathRun['status']),
          modelIds: modelIds
            .map((item) => readRecordString(item))
            .filter((item): item is string => Boolean(item)),
          failedNodeIds: failedNodeIds
            .map((item) => readRecordString(item))
            .filter((item): item is string => Boolean(item)),
          latestErrorMessage: readRecordString(aiPathRun['latestErrorMessage']),
        }
      : null,
  };
};

const readAlertEvidence = (log: SystemLogRecord): AlertEvidenceDisplay | null => {
  const context = asRecord(log.context);
  const alertEvidence = asRecord(context?.['alertEvidence']);
  if (!alertEvidence) return null;

  const samples = Array.isArray(alertEvidence['samples']) ? alertEvidence['samples'] : [];

  return {
    matchedCount: readRecordNumber(alertEvidence['matchedCount']),
    sampleSize: readRecordNumber(alertEvidence['sampleSize']),
    windowStart: readRecordString(alertEvidence['windowStart']),
    windowEnd: readRecordString(alertEvidence['windowEnd']),
    lastObservedLog: readAlertEvidenceSample(alertEvidence['lastObservedLog']),
    samples: samples
      .map((sample) => readAlertEvidenceSample(sample))
      .filter((sample): sample is AlertEvidenceSampleDisplay => Boolean(sample)),
  };
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
  'system-alerts-last24h': AlertTriangle,
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
            <div className='space-y-3'>
              <div>
                <Hint uppercase variant='muted' className='mb-1 text-[10px]'>
                  Top Sources
                </Hint>
                <div className='max-h-[80px] overflow-y-auto pr-2 space-y-1'>
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
                  {metrics.topSources.length === 0 && (
                    <div className='text-[11px] text-gray-600'>No source data for this filter.</div>
                  )}
                </div>
              </div>
              <div>
                <Hint uppercase variant='muted' className='mb-1 text-[10px]'>
                  Top Paths
                </Hint>
                <div className='max-h-[80px] overflow-y-auto pr-2 space-y-1'>
                  {metrics.topPaths.map((item: { path: string; count: number }) => (
                    <PropertyRow
                      key={item.path}
                      label={
                        <StatusBadge
                          status={item.path}
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
                  {metrics.topPaths.length === 0 && (
                    <div className='text-[11px] text-gray-600'>No path data for this filter.</div>
                  )}
                </div>
              </div>
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
    handleFilterChange,
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
        cell: ({ row }) => {
          const aiPathRun = readAiPathRunStaticContext(row.original);
          const alertEvidence = readAlertEvidence(row.original);

          return (
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
              {(aiPathRun || alertEvidence) && (
                <div className='flex flex-wrap items-center gap-1.5 pt-1'>
                  {aiPathRun ? (
                    <>
                      <StatusBadge status='AI Path' variant='info' size='sm' className='h-4' />
                      {aiPathRun.pathName ? (
                        <span className='text-[10px] text-sky-200/80'>{aiPathRun.pathName}</span>
                      ) : null}
                      {aiPathRun.status ? (
                        <StatusBadge
                          status={aiPathRun.status}
                          variant={getStatusVariant(aiPathRun.status)}
                          size='sm'
                          className='h-4'
                        />
                      ) : null}
                    </>
                  ) : null}
                  {alertEvidence ? (
                    <span className='text-[10px] text-amber-200/80'>
                      Alert evidence: {alertEvidence.sampleSize ?? alertEvidence.samples.length} sample
                      {(alertEvidence.sampleSize ?? alertEvidence.samples.length) === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => {
          const source = row.original.source || 'system';
          const isAlert = source === 'system-log-alerts';
          return (
            <div className='flex items-center gap-1'>
              {isAlert && <AlertTriangle className='size-3 text-amber-400' />}
              <StatusBadge
                status={source}
                variant={isAlert ? 'warning' : 'neutral'}
                size='sm'
                className='font-mono uppercase'
              />
            </div>
          );
        },
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
        const alertType = readContextString(log, 'alertType');
        const aiPathRun = readAiPathRunStaticContext(log);
        const alertEvidence = readAlertEvidence(log);
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
                    <MetadataItem label='Alert Type' value={alertType} />
                  </div>
                  {(log.requestId || log.userId || fingerprint) && (
                    <div className='mt-3 flex flex-wrap gap-2 text-[11px]'>
                      {log.requestId && (
                        <Button
                          type='button'
                          variant='outline'
                          size='xs'
                          className='h-6 px-2'
                          onClick={() => handleFilterChange('requestId', log.requestId ?? '')}
                        >
                          <SearchIcon className='mr-1 size-3' />
                          View all in request
                        </Button>
                      )}
                      {log.userId && (
                        <Button
                          type='button'
                          variant='outline'
                          size='xs'
                          className='h-6 px-2'
                          onClick={() => handleFilterChange('userId', log.userId ?? '')}
                        >
                          <SearchIcon className='mr-1 size-3' />
                          View all for user
                        </Button>
                      )}
                      {fingerprint && (
                        <Button
                          type='button'
                          variant='outline'
                          size='xs'
                          className='h-6 px-2'
                          onClick={() => handleFilterChange('fingerprint', fingerprint ?? '')}
                        >
                          <SearchIcon className='mr-1 size-3' />
                          View similar errors
                        </Button>
                      )}
                    </div>
                  )}
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

              <div className='space-y-4'>
                {aiPathRun ? (
                  <div>
                    <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                      Runtime Context
                    </Hint>
                    <Card variant='glass' padding='md' className='space-y-4 bg-sky-950/20'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <StatusBadge status='AI Path Run' variant='info' size='sm' />
                        {aiPathRun.status ? (
                          <StatusBadge
                            status={aiPathRun.status}
                            variant={getStatusVariant(aiPathRun.status)}
                            size='sm'
                          />
                        ) : null}
                      </div>
                      <div className='grid grid-cols-2 gap-2'>
                        <MetadataItem label='Run ID' value={aiPathRun.runId} mono />
                        <MetadataItem label='Path' value={aiPathRun.pathName} />
                        <MetadataItem label='Entity Type' value={aiPathRun.entityType} />
                        <MetadataItem label='Entity ID' value={aiPathRun.entityId} mono />
                        <MetadataItem label='Trigger Event' value={aiPathRun.triggerEvent} />
                        <MetadataItem label='Trigger Node' value={aiPathRun.triggerNodeId} mono />
                        <MetadataItem
                          label='Runtime Fingerprint'
                          value={aiPathRun.runtimeFingerprint}
                          mono
                        />
                      </div>
                      {aiPathRun.summary ? (
                        <div className='grid grid-cols-2 gap-2 text-[11px] text-gray-300'>
                          {Object.entries(aiPathRun.summary).map(([key, value]) => (
                            <PropertyRow
                              key={key}
                              label={key}
                              value={value}
                              mono
                              variant='subtle'
                              className='rounded bg-white/5 px-2 py-1'
                            />
                          ))}
                        </div>
                      ) : null}
                      {aiPathRun.executedModels.length ? (
                        <div>
                          <Hint uppercase variant='muted' className='mb-2 text-[10px] font-semibold'>
                            Executed Models
                          </Hint>
                          <div className='space-y-2'>
                            {aiPathRun.executedModels.map((model, index) => (
                              <div
                                key={`${model.nodeId ?? 'node'}-${index}`}
                                className='rounded border border-white/5 bg-black/20 px-3 py-2'
                              >
                                <div className='flex flex-wrap items-center gap-2'>
                                  {model.modelId ? (
                                    <StatusBadge
                                      status={model.modelId}
                                      variant='neutral'
                                      size='sm'
                                      className='font-mono'
                                    />
                                  ) : (
                                    <StatusBadge status='Brain Default' variant='neutral' size='sm' />
                                  )}
                                  {model.status ? (
                                    <StatusBadge
                                      status={model.status}
                                      variant={getStatusVariant(model.status)}
                                      size='sm'
                                    />
                                  ) : null}
                                </div>
                                {model.errorMessage ? (
                                  <p className='mt-2 text-[11px] text-rose-200/90'>{model.errorMessage}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {aiPathRun.failedNodes.length ? (
                        <div>
                          <Hint uppercase variant='muted' className='mb-2 text-[10px] font-semibold'>
                            Failed Nodes
                          </Hint>
                          <div className='space-y-2'>
                            {aiPathRun.failedNodes.map((node, index) => (
                              <div
                                key={`${node.nodeId ?? 'failed'}-${index}`}
                                className='rounded border border-rose-500/10 bg-rose-950/10 px-3 py-2'
                              >
                                <div className='flex flex-wrap items-center gap-2'>
                                  {node.nodeId ? (
                                    <StatusBadge
                                      status={node.nodeId}
                                      variant='neutral'
                                      size='sm'
                                      className='font-mono'
                                    />
                                  ) : null}
                                  {node.status ? (
                                    <StatusBadge
                                      status={node.status}
                                      variant={getStatusVariant(node.status)}
                                      size='sm'
                                    />
                                  ) : null}
                                </div>
                                {node.errorMessage ? (
                                  <p className='mt-2 text-[11px] text-rose-200/90'>{node.errorMessage}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {aiPathRun.recentErrorEvents.length ? (
                        <div>
                          <Hint uppercase variant='muted' className='mb-2 text-[10px] font-semibold'>
                            Recent Runtime Errors
                          </Hint>
                          <div className='space-y-2'>
                            {aiPathRun.recentErrorEvents.map((event, index) => (
                              <div
                                key={`${event.createdAt ?? 'event'}-${index}`}
                                className='rounded border border-white/5 bg-black/20 px-3 py-2'
                              >
                                <div className='flex flex-wrap items-center gap-2'>
                                  {event.level ? (
                                    <StatusBadge
                                      status={event.level}
                                      variant={getStatusVariant(event.level)}
                                      size='sm'
                                    />
                                  ) : null}
                                  {event.createdAt ? (
                                    <span className='text-[10px] font-mono text-gray-500'>
                                      {formatTimestamp(event.createdAt)}
                                    </span>
                                  ) : null}
                                </div>
                                {event.message ? (
                                  <p className='mt-2 text-[11px] text-gray-200/90'>{event.message}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </Card>
                  </div>
                ) : null}

                {alertEvidence ? (
                  <div>
                    <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                      Alert Evidence
                    </Hint>
                    <Card variant='glass' padding='md' className='space-y-4 bg-amber-950/15'>
                      <div className='grid grid-cols-2 gap-2'>
                        <MetadataItem label='Matched Count' value={alertEvidence.matchedCount} mono />
                        <MetadataItem label='Sample Size' value={alertEvidence.sampleSize} mono />
                        <MetadataItem
                          label='Window Start'
                          value={alertEvidence.windowStart ? formatTimestamp(alertEvidence.windowStart) : null}
                        />
                        <MetadataItem
                          label='Window End'
                          value={alertEvidence.windowEnd ? formatTimestamp(alertEvidence.windowEnd) : null}
                        />
                      </div>
                      {alertEvidence.lastObservedLog ? (
                        <div>
                          <Hint uppercase variant='muted' className='mb-2 text-[10px] font-semibold'>
                            Last Observed Log
                          </Hint>
                          <div className='rounded border border-white/5 bg-black/20 px-3 py-2'>
                            <div className='flex flex-wrap items-center gap-2'>
                              {alertEvidence.lastObservedLog.level ? (
                                <StatusBadge
                                  status={alertEvidence.lastObservedLog.level}
                                  variant={getStatusVariant(alertEvidence.lastObservedLog.level)}
                                  size='sm'
                                />
                              ) : null}
                              {alertEvidence.lastObservedLog.source ? (
                                <StatusBadge
                                  status={alertEvidence.lastObservedLog.source}
                                  variant='neutral'
                                  size='sm'
                                  className='font-mono'
                                />
                              ) : null}
                            </div>
                            {alertEvidence.lastObservedLog.message ? (
                              <p className='mt-2 text-[11px] text-gray-200/90'>
                                {alertEvidence.lastObservedLog.message}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      {alertEvidence.samples.length ? (
                        <div>
                          <Hint uppercase variant='muted' className='mb-2 text-[10px] font-semibold'>
                            Sampled Logs
                          </Hint>
                          <div className='space-y-2'>
                            {alertEvidence.samples.map((sample, index) => (
                              <div
                                key={`${sample.logId ?? 'sample'}-${index}`}
                                className='rounded border border-white/5 bg-black/20 px-3 py-2'
                              >
                                <div className='flex flex-wrap items-center gap-2'>
                                  {sample.level ? (
                                    <StatusBadge
                                      status={sample.level}
                                      variant={getStatusVariant(sample.level)}
                                      size='sm'
                                    />
                                  ) : null}
                                  {sample.source ? (
                                    <StatusBadge
                                      status={sample.source}
                                      variant='neutral'
                                      size='sm'
                                      className='font-mono'
                                    />
                                  ) : null}
                                  {sample.createdAt ? (
                                    <span className='text-[10px] font-mono text-gray-500'>
                                      {formatTimestamp(sample.createdAt)}
                                    </span>
                                  ) : null}
                                </div>
                                {sample.message ? (
                                  <p className='mt-2 text-[11px] text-gray-200/90'>{sample.message}</p>
                                ) : null}
                                {(sample.fingerprint || sample.runId || sample.jobId) && (
                                  <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400'>
                                    {sample.fingerprint ? <span>fp: {sample.fingerprint}</span> : null}
                                    {sample.runId ? <span>run: {sample.runId}</span> : null}
                                    {sample.jobId ? <span>job: {sample.jobId}</span> : null}
                                  </div>
                                )}
                                {sample.aiPathRun ? (
                                  <div className='mt-2 flex flex-wrap items-center gap-2 text-[10px] text-sky-200/80'>
                                    {sample.aiPathRun.pathName ? <span>{sample.aiPathRun.pathName}</span> : null}
                                    {sample.aiPathRun.status ? (
                                      <StatusBadge
                                        status={sample.aiPathRun.status}
                                        variant={getStatusVariant(sample.aiPathRun.status)}
                                        size='sm'
                                      />
                                    ) : null}
                                    {sample.aiPathRun.modelIds.length ? (
                                      <span>models: {sample.aiPathRun.modelIds.join(', ')}</span>
                                    ) : null}
                                    {sample.aiPathRun.failedNodeIds.length ? (
                                      <span>failed nodes: {sample.aiPathRun.failedNodeIds.join(', ')}</span>
                                    ) : null}
                                  </div>
                                ) : null}
                                {sample.aiPathRun?.latestErrorMessage ? (
                                  <p className='mt-2 text-[11px] text-rose-200/90'>
                                    {sample.aiPathRun.latestErrorMessage}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </Card>
                  </div>
                ) : null}

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
