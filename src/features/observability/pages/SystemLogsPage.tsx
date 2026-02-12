'use client';

import { AlertTriangle, Copy, Link2, Monitor, Server, Shield, Trash2 } from 'lucide-react';

import { SystemLogsProvider, useSystemLogsContext } from '@/features/observability/context/SystemLogsContext';
import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  SYSTEM_LOG_TRIAGE_PRESETS,
  isSystemLogPresetActive,
  resolveSystemLogPresetFilters,
  type LogTriagePreset,
  type SystemLogFilterFormValues,
} from '@/features/observability/lib/log-triage-presets';
import type { SystemLogRecord, AiInsightRecord } from '@/shared/types';
import { Button, DynamicFilters, ListPanel, SectionPanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Pagination, StatusBadge, ConfirmDialog, PageLayout, RefreshButton, FormSection } from '@/shared/ui';
import { cn } from '@/shared/utils';

const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const getContextValue = (context: unknown, path: string): unknown => {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return null;
  let current: unknown = context;
  for (const key of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current ?? null;
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
    rebuildIndexesMutation,
    setIsRebuildIndexesConfirmOpen,
  } = useSystemLogsContext();

  return (
    <FormSection
      title='Diagnostics'
      description='Mongo index status for AI Paths runtime collections.'
      actions={
        <div className='flex items-center gap-2 text-xs text-gray-500'>
          <span>
            {diagnosticsUpdatedAt
              ? `Updated ${formatTimestamp(diagnosticsUpdatedAt)}`
              : '—'}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={(): void => {
              void mongoDiagnosticsQuery.refetch();
            }}
            disabled={mongoDiagnosticsQuery.isFetching}
          >
            Refresh
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setIsRebuildIndexesConfirmOpen(true)}
            disabled={rebuildIndexesMutation.isPending}
            className='border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
          >
            {rebuildIndexesMutation.isPending ? 'Rebuilding...' : 'Rebuild missing indexes'}
          </Button>
        </div>
      }
      className='space-y-4'
    >
      {mongoDiagnosticsQuery.isLoading ? (
        <div className='text-sm text-gray-400'>Loading diagnostics...</div>
      ) : diagnostics.length === 0 ? (
        <div className='text-sm text-gray-400'>No diagnostics available.</div>
      ) : (
        <div className='rounded-md border border-border/70 bg-card/60'>
          <Table>
            <TableHeader>
              <TableRow className='border-border/60'>
                <TableHead className='text-xs text-gray-400'>Collection</TableHead>
                <TableHead className='text-xs text-gray-400'>Expected</TableHead>
                <TableHead className='text-xs text-gray-400'>Missing</TableHead>
                <TableHead className='text-xs text-gray-400'>Extra</TableHead>
                <TableHead className='text-xs text-gray-400 text-right'>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diagnostics.map((collection) => {
                const missingCount = collection.missing.length;
                const extraCount = collection.extra.length;
                const statusLabel = collection.error
                  ? 'Error'
                  : missingCount === 0
                    ? 'OK'
                    : 'Missing';
                return (
                  <TableRow key={collection.name} className='border-border/50'>
                    <TableCell className='font-mono text-xs text-gray-200'>
                      {collection.name}
                    </TableCell>
                    <TableCell className='text-xs text-gray-300'>
                      {collection.expected.length}
                    </TableCell>
                    <TableCell className='text-xs text-gray-300'>
                      {collection.error ? (
                        <div className='space-y-1 text-rose-200'>
                          <div>—</div>
                          <div className='rounded bg-rose-500/10 px-2 py-1 text-[10px]'>
                            {collection.error}
                          </div>
                        </div>
                      ) : missingCount === 0 ? (
                        '0'
                      ) : (
                        <div className='space-y-1'>
                          <div className='text-amber-200'>{missingCount}</div>
                          <div className='space-y-1 text-[10px] text-amber-200'>
                            {collection.missing.map((item) => (
                              <div
                                key={JSON.stringify(item.key)}
                                className='rounded bg-amber-500/10 px-2 py-1'
                              >
                                {JSON.stringify(item.key)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-xs text-gray-300'>
                      {extraCount}
                    </TableCell>
                    <TableCell className='text-right'>
                      <span
                        className={`rounded border px-2 py-0.5 text-xs ${
                          collection.error
                            ? 'border-rose-400/40 text-rose-200 bg-rose-500/10'
                            : missingCount === 0
                              ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                              : 'border-amber-400/40 text-amber-200 bg-amber-500/10'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </FormSection>
  );
}

function LogMetrics(): React.JSX.Element {
  const { metricsQuery, metrics, levels } = useSystemLogsContext();

  return (
    <FormSection
      title='Metrics'
      description='Metrics reflect the current filters.'
      variant='subtle'
      actions={
        <div className='text-xs text-gray-500'>
          {metrics?.generatedAt ? `Updated ${formatTimestamp(metrics.generatedAt)}` : '—'}
        </div>
      }
      className='p-4'
    >
      {metricsQuery.isLoading ? (
        <div className='mt-4 text-sm text-gray-400'>Loading metrics...</div>
      ) : !metrics ? (
        <div className='mt-4 text-sm text-gray-400'>
          No metrics available yet.
        </div>
      ) : (
        <div className='mt-4 grid gap-4 md:grid-cols-3'>
          <SectionPanel variant='subtle-compact' className='p-3'>
            <div className='text-xs text-gray-400'>Totals</div>
            <div className='mt-2 space-y-1 text-sm text-gray-200'>
              <div>Total: {metrics.total}</div>
              <div>Last 24h: {metrics.last24Hours}</div>
              <div>Last 7d: {metrics.last7Days}</div>
            </div>
          </SectionPanel>
          <SectionPanel variant='subtle-compact' className='p-3'>
            <div className='text-xs text-gray-400'>By level</div>
            <div className='mt-2 space-y-1 text-sm text-gray-200'>
              <div className='text-red-300'>Errors: {levels.error}</div>
              <div className='text-yellow-300'>Warnings: {levels.warn}</div>
              <div className='text-blue-300'>Info: {levels.info}</div>
            </div>
          </SectionPanel>
          <SectionPanel variant='subtle-compact' className='p-3'>
            <div className='text-xs text-gray-400'>Top sources</div>
            {metrics.topSources.length === 0 ? (
              <div className='mt-2 text-xs text-gray-500'>No sources yet.</div>
            ) : (
              <div className='mt-2 space-y-1 text-xs text-gray-300'>
                {metrics.topSources.map((item) => (
                  <div key={item.source} className='flex items-center justify-between gap-2'>
                    <span className='truncate'>{item.source}</span>
                    <span className='text-gray-500'>{item.count}</span>
                  </div>
                ))}
              </div>
            )}
            <div className='mt-3 text-xs text-gray-400'>Top paths</div>
            {metrics.topPaths.length === 0 ? (
              <div className='mt-2 text-xs text-gray-500'>No paths yet.</div>
            ) : (
              <div className='mt-2 space-y-1 text-xs text-gray-300'>
                {metrics.topPaths.map((item) => (
                  <div key={item.path} className='flex items-center justify-between gap-2'>
                    <span className='truncate'>{item.path}</span>
                    <span className='text-gray-500'>{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>
      )}
    </FormSection>
  );
}

function AiLogInterpreter(): React.JSX.Element {
  const { runInsightMutation, insightsQuery } = useSystemLogsContext();

  return (
    <FormSection
      title='AI Log Interpreter'
      description='Summarizes error patterns and potential causes using your configured AI model or agent.'
      variant='subtle'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => runInsightMutation.mutate()}
          disabled={runInsightMutation.isPending}
        >
          {runInsightMutation.isPending ? 'Running...' : 'Run AI Interpretation'}
        </Button>
      }
      className='p-4'
    >
      {insightsQuery.isLoading ? (
        <div className='text-xs text-gray-400'>Loading AI insights...</div>
      ) : insightsQuery.error ? (
        <div className='text-xs text-red-400'>{(insightsQuery.error).message}</div>
      ) : (insightsQuery.data?.insights?.length ?? 0) === 0 ? (
        <div className='text-xs text-gray-500'>No AI insights yet.</div>
      ) : (
        <div className='space-y-3'>
          {insightsQuery.data?.insights.map((insight: AiInsightRecord) => (
            <div key={insight.id} className='rounded-md border border-border/60 bg-gray-950/40 p-3 text-xs text-gray-300'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[10px] uppercase text-gray-500'>
                  {formatTimestamp(insight.createdAt)}
                </span>
                <StatusBadge status={insight.status} />
              </div>
              <div className='mt-2 text-sm text-white'>{insight.summary}</div>
              {insight.warnings.length > 0 ? (
                <ul className='mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
                  {insight.warnings.map((warning: string, index: number) => (
                    <li key={`${insight.id}-warn-${index}`}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className='mt-3 text-[10px] text-gray-500'>
        Configure the AI model/agent in Settings → AI.
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

  return (
    <SectionPanel variant='subtle' className='p-0'>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 text-xs text-gray-400'>
        <span>
          Showing {logs.length} of {total} logs
        </span>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className='scale-90 origin-right'
        />
      </div>
      {logsQuery.isLoading ? (
        <div className='px-4 py-8 text-sm text-gray-400'>Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className='px-4 py-8 text-sm text-gray-400'>
          No system logs found.
        </div>
      ) : (
        <div className='divide-y divide-border'>
          {logs.map((log: SystemLogRecord) => (
            <div key={log.id} className='px-4 py-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <StatusBadge
                    status={log.level}
                    variant={log.level === 'warn' ? 'warning' : log.level as 'info' | 'success' | 'warning' | 'error'}
                  />
                  <span className='text-xs text-gray-400'>
                    {formatTimestamp(log.createdAt)}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  {log.source ? (
                    <span className='text-xs text-gray-500'>{log.source}</span>
                  ) : null}
                  {log.requestId ? (
                    <span className='rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-gray-400'>
                      {log.requestId}
                    </span>
                  ) : null}
                  {log.userId ? (
                    <span className='rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-gray-400'>
                      {log.userId}
                    </span>
                  ) : null}
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => interpretLogMutation.mutate(log.id)}
                    disabled={interpretLogMutation.isPending}
                    className='h-6 px-2 text-[10px]'
                  >
                    Interpret
                  </Button>
                </div>
              </div>
              <div className='mt-2 text-sm text-gray-200'>{log.message}</div>
              {(log.path || log.method || log.statusCode) && (
                <div className='mt-2 text-xs text-gray-500'>
                  {log.method ? `${log.method} ` : ''}
                  {log.path ?? ''}
                  {log.statusCode ? ` • ${log.statusCode}` : ''}
                </div>
              )}
              {log.context && getContextValue(log.context, 'fingerprint') ? (
                <div className='mt-2 text-xs text-gray-500'>
                  Fingerprint:{' '}
                  <span className='font-mono text-gray-300'>
                    {String(getContextValue(log.context, 'fingerprint'))}
                  </span>
                </div>
              ) : null}
              {log.context && getContextValue(log.context, 'category') ? (
                <div className='mt-1 text-xs text-gray-500'>
                  Category:{' '}
                  <span className='font-mono text-gray-300'>
                    {String(getContextValue(log.context, 'category'))}
                  </span>
                </div>
              ) : null}
              {(log.context || log.stack) && (
                <details className='mt-2 text-xs text-gray-400'>
                  <summary className='cursor-pointer hover:text-gray-200'>
                    Details
                  </summary>
                  {logInterpretations[log.id] ? (
                    <SectionPanel variant='subtle-compact' className='mt-2 p-2 text-[11px] text-gray-300'>
                      <div className='font-semibold text-gray-200'>AI Interpretation</div>
                      <div className='mt-2 text-gray-300'>
                        {logInterpretations[log.id]?.summary}
                      </div>
                      {logInterpretations[log.id]?.warnings?.length ? (
                        <ul className='mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
                          {logInterpretations[log.id]?.warnings?.map((warning: string, index: number) => (
                            <li key={`${log.id}-ai-${index}`}>{warning}</li>
                          ))}
                        </ul>
                      ) : null}
                    </SectionPanel>
                  ) : null}
                  {log.source === 'client' && log.context ? (
                    <SectionPanel variant='subtle-compact' className='mt-2 p-2 text-[11px] text-gray-300'>
                      <div className='font-semibold text-gray-200'>Client context</div>
                      <div className='mt-2 grid gap-2 md:grid-cols-2'>
                        <div>
                          <div className='text-gray-500'>App</div>
                          <div>{String((getContextValue(log.context, 'app.version') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>Build</div>
                          <div>{String((getContextValue(log.context, 'app.buildId') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>Release</div>
                          <div>{String((getContextValue(log.context, 'app.releaseChannel') as string | number | null) ?? '—')}</div>
                        </div>
                        <div>
                          <div className='text-gray-500'>User</div>
                          <div>{String((getContextValue(log.context, 'user.email') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>Role</div>
                          <div>{String((getContextValue(log.context, 'user.role') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>Route</div>
                          <div>{String((getContextValue(log.context, 'route') as string | number | null) ?? '—')}</div>
                        </div>
                        <div>
                          <div className='text-gray-500'>Device</div>
                          <div>{String((getContextValue(log.context, 'device.platform') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>Memory</div>
                          <div>{String((getContextValue(log.context, 'device.deviceMemory') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>Cores</div>
                          <div>{String((getContextValue(log.context, 'device.hardwareConcurrency') as string | number | null) ?? '—')}</div>
                        </div>
                        <div>
                          <div className='text-gray-500'>Network</div>
                          <div>{String((getContextValue(log.context, 'network.effectiveType') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>Downlink</div>
                          <div>{String((getContextValue(log.context, 'network.downlink') as string | number | null) ?? '—')}</div>
                          <div className='text-gray-500'>RTT</div>
                          <div>{String((getContextValue(log.context, 'network.rtt') as string | number | null) ?? '—')}</div>
                        </div>
                      </div>
                    </SectionPanel>
                  ) : null}
                  {log.stack && (
                    <pre className='mt-2 whitespace-pre-wrap rounded border border-border bg-card p-2 text-[11px] text-gray-300'>
                      {log.stack}
                    </pre>
                  )}
                  {log.context && (
                    <pre className='mt-2 whitespace-pre-wrap rounded border border-border bg-card p-2 text-[11px] text-gray-300'>
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionPanel>
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
      title='System Logs'
      description='Centralized error and warning events captured across the platform.'
      refresh={{
        onRefresh: (): void => {
          void logsQuery.refetch();
          void metricsQuery.refetch();
        },
        isRefreshing: logsQuery.isFetching || metricsQuery.isFetching,
      }}
      headerActions={
        <>
          <Button
            variant='outline'
            size='sm'
            onClick={() => window.location.assign('/admin/settings/logging')}
          >
            Client Logging Settings
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='gap-2'
            onClick={(): void => {
              if (typeof window === 'undefined') return;
              void navigator.clipboard
                .writeText(window.location.href)
                .then(() => {
                  toast('Investigation link copied', { variant: 'success' });
                })
                .catch(() => {
                  toast('Failed to copy link', { variant: 'error' });
                });
            }}
          >
            <Link2 className='h-4 w-4' />
            Copy Link
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='gap-2'
            disabled={logs.length === 0}
            onClick={(): void => {
              void navigator.clipboard.writeText(logsJson).then(() => {
                toast('Copied to clipboard', { variant: 'success' });
              });
            }}
          >
            <Copy className='h-4 w-4' />
            Copy
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setIsClearLogsConfirmOpen(true)}
            className='border-red-500/40 text-red-200 hover:bg-red-500/10'
            disabled={clearLogsMutation.isPending}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            {clearLogsMutation.isPending ? 'Clearing...' : 'Clear Logs'}
          </Button>
        </>
      }
    >
      <ListPanel
        variant='flat'
        alerts={
          <>
            <ConfirmDialog
              open={isClearLogsConfirmOpen}
              onOpenChange={setIsClearLogsConfirmOpen}
              onConfirm={(): void => {
                void handleClearLogs();
              }}
              title='Clear System Logs'
              description='Are you sure you want to clear all system logs? This action cannot be undone.'
              confirmText='Clear All'
              variant='destructive'
            />
            <ConfirmDialog
              open={isRebuildIndexesConfirmOpen}
              onOpenChange={setIsRebuildIndexesConfirmOpen}
              onConfirm={(): void => {
                void handleRebuildMongoIndexes();
              }}
              title='Rebuild Indexes'
              description='This will scan AI Paths collections and create missing indexes. Proceed?'
              confirmText='Rebuild'
            />
            <LogDiagnostics />
          </>
        }
        filters={
          <div className='space-y-3'>
            <LogTriagePresets
              values={currentFilterValues}
              onApplyPreset={handleApplyPreset}
              onClearPreset={handleResetFilters}
            />
            <DynamicFilters
              fields={filterFields}
              values={currentFilterValues}
              onChange={handleFilterChange}
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
        }
      >
        <div className='space-y-6'>
          <LogMetrics />
          <AiLogInterpreter />
          <LogList />
        </div>
      </ListPanel>
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
