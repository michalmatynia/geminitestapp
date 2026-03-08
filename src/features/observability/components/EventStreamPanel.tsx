'use client';

import { AlertTriangle, Monitor, SearchIcon, Eye } from 'lucide-react';
import React, { useMemo } from 'react';

import { DOCUMENTATION_MODULE_IDS } from '@/shared/lib/documentation';
import {
  useSystemLogsActions,
  useSystemLogsState,
} from '@/features/observability/context/SystemLogsContext';
import { getDocumentationTooltip } from '@/shared/lib/documentation';
import { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import {
  Button,
  StandardDataTablePanel,
  Pagination,
  StatusBadge,
  Alert,
  MetadataItem,
  Tooltip,
  Hint,
  Card,
  type StatusVariant,
} from '@/shared/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { formatTimestamp } from '../utils/formatTimestamp';
import {
  readLogContextRegistry,
  getPrimaryContextDocument,
  readAlertEvidence,
  getStatusVariant,
  getLogCategory,
  readContextString,
} from '../utils/logHelpers';
import { ContextDocumentCard } from './ContextDocumentCard';
import { ContextRegistryNodesCard } from './ContextRegistryNodesCard';

export function EventStreamPanel(): React.JSX.Element {
  const { logsQuery, logs, total, totalPages, page, interpretLogMutation, logInterpretations } =
    useSystemLogsState();
  const { setPage, handleFilterChange } = useSystemLogsActions();
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
          const contextRegistry = readLogContextRegistry(row.original);
          const primaryContextDocument = getPrimaryContextDocument(contextRegistry);
          const alertEvidence = readAlertEvidence(row.original);

          return (
            <div className='flex flex-col gap-1 max-w-[500px]'>
              <Tooltip content={row.original.message} className='w-full'>
                <span
                  tabIndex={0}
                  className='block truncate rounded-sm text-sm font-medium text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
                  aria-label={row.original.message}
                  title={row.original.message}
                >
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
              {(primaryContextDocument || alertEvidence) && (
                <div className='flex flex-wrap items-center gap-1.5 pt-1'>
                  {primaryContextDocument ? (
                    <>
                      <StatusBadge status='Context' variant='info' size='sm' className='h-4' />
                      <span className='text-[10px] text-sky-200/80'>
                        {primaryContextDocument.title}
                      </span>
                      {primaryContextDocument.status ? (
                        <StatusBadge
                          status={primaryContextDocument.status}
                          variant={getStatusVariant(primaryContextDocument.status)}
                          size='sm'
                          className='h-4'
                        />
                      ) : null}
                    </>
                  ) : null}
                  {alertEvidence ? (
                    <span className='text-[10px] text-amber-200/80'>
                      Alert evidence: {alertEvidence.sampleSize ?? alertEvidence.samples.length}{' '}
                      sample
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
        const contextRegistry = readLogContextRegistry(log);
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
                    <MetadataItem label='Trace ID' value={log.traceId} mono />
                    <MetadataItem label='Correlation ID' value={log.correlationId} mono />
                    <MetadataItem label='Service' value={log.service} mono />
                    <MetadataItem label='User ID' value={log.userId} mono />
                    <MetadataItem label='Error ID' value={errorId} mono />
                    <MetadataItem label='Category' value={category} />
                    <MetadataItem label='Error Code' value={errorCode} mono />
                    <MetadataItem label='Error Name' value={errorName} />
                    <MetadataItem label='Fingerprint' value={fingerprint} mono />
                    <MetadataItem label='Alert Type' value={alertType} />
                  </div>
                  {(log.requestId ||
                    log.traceId ||
                    log.correlationId ||
                    log.service ||
                    log.userId ||
                    fingerprint) && (
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
                      {log.traceId && (
                        <Button
                          type='button'
                          variant='outline'
                          size='xs'
                          className='h-6 px-2'
                          onClick={() => handleFilterChange('traceId', log.traceId ?? '')}
                        >
                          <SearchIcon className='mr-1 size-3' />
                          View full trace
                        </Button>
                      )}
                      {log.correlationId && (
                        <Button
                          type='button'
                          variant='outline'
                          size='xs'
                          className='h-6 px-2'
                          onClick={() =>
                            handleFilterChange('correlationId', log.correlationId ?? '')
                          }
                        >
                          <SearchIcon className='mr-1 size-3' />
                          View correlation
                        </Button>
                      )}
                      {log.service && (
                        <Button
                          type='button'
                          variant='outline'
                          size='xs'
                          className='h-6 px-2'
                          onClick={() => handleFilterChange('service', log.service ?? '')}
                        >
                          <SearchIcon className='mr-1 size-3' />
                          View service logs
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
                {contextRegistry?.documents.length || contextRegistry?.nodes.length ? (
                  <div>
                    <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                      Context Registry
                    </Hint>
                    <div className='space-y-3'>
                      {contextRegistry?.refs.length ? (
                        <Card variant='glass' padding='md' className='space-y-3 bg-white/5'>
                          <Hint uppercase variant='muted' className='font-semibold'>
                            Registry Refs
                          </Hint>
                          <div className='flex flex-wrap gap-2'>
                            {contextRegistry.refs.map((ref) => (
                              <StatusBadge
                                key={ref}
                                status={ref}
                                variant='neutral'
                                size='sm'
                                className='font-mono'
                              />
                            ))}
                          </div>
                        </Card>
                      ) : null}
                      {contextRegistry?.documents.map((document) => (
                        <ContextDocumentCard key={document.id} document={document} />
                      ))}
                      <ContextRegistryNodesCard nodes={contextRegistry?.nodes ?? []} />
                    </div>
                  </div>
                ) : null}

                {alertEvidence ? (
                  <div>
                    <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                      Alert Evidence
                    </Hint>
                    <Card variant='glass' padding='md' className='space-y-4 bg-amber-950/15'>
                      <div className='grid grid-cols-2 gap-2'>
                        <MetadataItem
                          label='Matched Count'
                          value={alertEvidence.matchedCount}
                          mono
                        />
                        <MetadataItem label='Sample Size' value={alertEvidence.sampleSize} mono />
                        <MetadataItem
                          label='Window Start'
                          value={
                            alertEvidence.windowStart
                              ? formatTimestamp(alertEvidence.windowStart)
                              : null
                          }
                        />
                        <MetadataItem
                          label='Window End'
                          value={
                            alertEvidence.windowEnd
                              ? formatTimestamp(alertEvidence.windowEnd)
                              : null
                          }
                        />
                      </div>
                      {alertEvidence.lastObservedLog ? (
                        <div>
                          <Hint
                            uppercase
                            variant='muted'
                            className='mb-2 text-[10px] font-semibold'
                          >
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
                          <Hint
                            uppercase
                            variant='muted'
                            className='mb-2 text-[10px] font-semibold'
                          >
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
                                  <p className='mt-2 text-[11px] text-gray-200/90'>
                                    {sample.message}
                                  </p>
                                ) : null}
                                {sample.fingerprint ? (
                                  <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400'>
                                    <span>fp: {sample.fingerprint}</span>
                                  </div>
                                ) : null}
                                {sample.contextRegistry?.refs.length ? (
                                  <div className='mt-2 flex flex-wrap gap-2'>
                                    {sample.contextRegistry.refs.map((ref) => (
                                      <StatusBadge
                                        key={`${sample.logId ?? 'sample'}-${ref}`}
                                        status={ref}
                                        variant='neutral'
                                        size='sm'
                                        className='font-mono'
                                      />
                                    ))}
                                  </div>
                                ) : null}
                                {sample.contextRegistry?.documents.length ? (
                                  <div className='mt-3 space-y-2'>
                                    {sample.contextRegistry.documents.map((document) => (
                                      <ContextDocumentCard
                                        key={`${sample.logId ?? 'sample'}-${document.id}`}
                                        document={document}
                                        accentClassName='bg-sky-950/10'
                                      />
                                    ))}
                                  </div>
                                ) : null}
                                <div className='mt-3'>
                                  <ContextRegistryNodesCard
                                    nodes={sample.contextRegistry?.nodes ?? []}
                                  />
                                </div>
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
