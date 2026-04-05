'use client';

import React from 'react';
import { AlertTriangle, Eye, Monitor, SearchIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { useSystemLogsActions, useSystemLogsState } from '@/features/observability/context/SystemLogsContext';
import { getDocumentationTooltip } from '@/shared/lib/documentation/tooltips';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import type { StatusVariant } from '@/shared/contracts/ui/ui/base';
import { Alert, Button, Card, Tooltip } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem, Pagination, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { DetailModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils/ui-utils';

import type {
  ContextDocumentDisplay,
  ContextDocumentSectionDisplay,
  ContextRegistryNodeDisplay,
} from '../../types';
import { formatTimestamp } from '../../utils/formatTimestamp';
import {
  getLogCategory,
  getPrimaryContextDocument,
  getStatusVariant,
  readAlertEvidence,
  readContextString,
  readLogContextRegistry,
} from '../../utils/logHelpers';

export function ContextDocumentCard(props: {
  document: ContextDocumentDisplay;
  accentClassName?: string;
}): React.JSX.Element {
  const { document, accentClassName = 'bg-sky-950/20' } = props;

  return (
    <Card variant='glass' padding='md' className={cn('space-y-4', accentClassName)}>
      <div className='flex flex-wrap items-center gap-2'>
        <StatusBadge
          status={document.entityType ?? 'runtime_document'}
          variant='info'
          size='sm'
          className='font-mono'
        />
        {document.status ? (
          <StatusBadge
            status={document.status}
            variant={getStatusVariant(document.status)}
            size='sm'
          />
        ) : null}
        {document.tags.map((tag: string) => (
          <StatusBadge key={`${document.id}-${tag}`} status={tag} variant='neutral' size='sm' />
        ))}
      </div>
      <div className='space-y-1'>
        <p className='text-sm font-semibold text-gray-100'>{document.title}</p>
        {document.summary ? (
          <p className='text-[11px] text-gray-300/90'>{document.summary}</p>
        ) : null}
      </div>
      {document.facts.length ? (
        <div className='grid grid-cols-2 gap-2'>
          {document.facts.map((fact: { label: string; value: React.ReactNode }) => (
            <MetadataItem
              key={`${document.id}-${fact.label}`}
              label={fact.label}
              value={fact.value}
              mono
            />
          ))}
        </div>
      ) : null}
      {document.sections.map((section: ContextDocumentSectionDisplay) => (
        <div key={`${document.id}-${section.id ?? section.title}`}>
          <Hint uppercase variant='muted' className='mb-2 text-[10px] font-semibold'>
            {section.title}
          </Hint>
          {section.summary ? (
            <p className='mb-2 text-[11px] text-gray-300/80'>{section.summary}</p>
          ) : null}
          {section.text ? (
            <p className='mb-2 rounded border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-gray-200/90'>
              {section.text}
            </p>
          ) : null}
          {section.items.length ? (
            <div className='space-y-2'>
              {section.items.map((item: Record<string, string>, index: number) => (
                <div
                  key={`${document.id}-${section.id ?? section.title}-${index}`}
                  className='rounded border border-white/5 bg-black/20 px-3 py-2'
                >
                  <div className='flex flex-wrap gap-2 text-[11px] text-gray-200/90'>
                    {Object.entries(item).map(([key, value]) => (
                      <MetadataItem
                        key={`${document.id}-${section.id ?? section.title}-${index}-${key}`}
                        label={key}
                        value={value}
                        mono
                        variant='subtle'
                        className='rounded bg-white/5 px-2 py-1'
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </Card>
  );
}

export function ContextRegistryNodesCard({
  nodes,
}: {
  nodes: ContextRegistryNodeDisplay[];
}): React.JSX.Element | null {
  if (!nodes.length) return null;

  return (
    <Card variant='glass' padding='md' className='space-y-3 bg-white/5'>
      <Hint uppercase variant='muted' className='font-semibold'>
        Related Registry Nodes
      </Hint>
      <div className='flex flex-wrap gap-2'>
        {nodes.map((node) => (
          <StatusBadge
            key={node.id}
            status={`${node.kind ?? 'node'}: ${node.name}`}
            variant='neutral'
            size='sm'
            className='max-w-full'
          />
        ))}
      </div>
    </Card>
  );
}

function renderSystemLogDetailsContent({
  log,
  interpretation,
  isInterpreting,
  onFilterChange,
}: {
  log: SystemLogRecord;
  interpretation?: { summary: string; warnings?: string[] | null };
  isInterpreting: boolean;
  onFilterChange: (key: string, value: string) => void;
}): React.JSX.Element {
  const category = getLogCategory(log);
  const fingerprint = readContextString(log, 'fingerprint');
  const errorCode = readContextString(log, 'errorCode') ?? readContextString(log, 'code');
  const errorName = readContextString(log, 'errorName') ?? readContextString(log, 'name');
  const errorId = readContextString(log, 'errorId');
  const alertType = readContextString(log, 'alertType');
  const contextRegistry = readLogContextRegistry(log);
  const alertEvidence = readAlertEvidence(log);

  return (
    <div className='space-y-6'>
      {interpretation ? (
        <Alert variant='success' className='p-4'>
          <div className='mb-2 flex items-center gap-2 text-[10px] font-bold uppercase'>
            <Monitor className='size-3' />
            AI Interpretation Output
          </div>
          <p className='text-sm leading-relaxed text-gray-200'>{interpretation.summary}</p>
          {interpretation.warnings?.length ? (
            <ul className='mt-3 space-y-1 border-t border-emerald-500/10 pt-2'>
              {interpretation.warnings.map((warning, index) => (
                <li key={index} className='text-[11px] opacity-80'>
                  • {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}

      {!interpretation && isInterpreting ? (
        <Card variant='glass' padding='md' className='space-y-2 bg-sky-950/20'>
          <Hint uppercase variant='muted' className='font-semibold'>
            AI Interpretation
          </Hint>
          <p className='text-sm text-gray-200'>Generating interpretation...</p>
        </Card>
      ) : null}

      <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
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
                    onClick={() => onFilterChange('requestId', log.requestId ?? '')}
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
                    onClick={() => onFilterChange('traceId', log.traceId ?? '')}
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
                    onClick={() => onFilterChange('correlationId', log.correlationId ?? '')}
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
                    onClick={() => onFilterChange('service', log.service ?? '')}
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
                    onClick={() => onFilterChange('userId', log.userId ?? '')}
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
                    onClick={() => onFilterChange('fingerprint', fingerprint ?? '')}
                  >
                    <SearchIcon className='mr-1 size-3' />
                    View similar errors
                  </Button>
                )}
              </div>
            )}
          </div>

          {log.stack ? (
            <div>
              <Hint uppercase variant='muted' className='mb-2 font-semibold'>
                StackTrace
              </Hint>
              <pre className='max-h-[300px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-gray-950 p-3 font-mono text-[10px] text-rose-300/80'>
                {log.stack}
              </pre>
            </div>
          ) : null}
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
                  <MetadataItem label='Matched Count' value={alertEvidence.matchedCount} mono />
                  <MetadataItem label='Sample Size' value={alertEvidence.sampleSize} mono />
                  <MetadataItem
                    label='Window Start'
                    value={
                      alertEvidence.windowStart ? formatTimestamp(alertEvidence.windowStart) : null
                    }
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
                              <span className='font-mono text-[10px] text-gray-500'>
                                {formatTimestamp(sample.createdAt)}
                              </span>
                            ) : null}
                          </div>
                          {sample.message ? (
                            <p className='mt-2 text-[11px] text-gray-200/90'>{sample.message}</p>
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
                            <ContextRegistryNodesCard nodes={sample.contextRegistry?.nodes ?? []} />
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
            <pre className='max-h-[400px] overflow-auto rounded-lg border border-white/5 bg-gray-950 p-3 font-mono text-[10px] text-sky-300/80'>
              {JSON.stringify(log.context || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventStreamPanel({
  showFooterPagination = true,
}: {
  showFooterPagination?: boolean;
} = {}): React.JSX.Element {
  const { logsQuery, logs, totalPages, page, interpretLogMutation, logInterpretations } =
    useSystemLogsState();
  const { setPage, handleFilterChange } = useSystemLogsActions();
  const [selectedLog, setSelectedLog] = React.useState<SystemLogRecord | null>(null);
  const aiInterpretationTooltip =
    getDocumentationTooltip(
      DOCUMENTATION_MODULE_IDS.observability,
      'system_logs_ai_interpretation'
    ) ?? 'AI Interpretation';

  const selectedInterpretation = React.useMemo(() => {
    const candidate = selectedLog ? logInterpretations[selectedLog.id] : undefined;
    if (!candidate?.summary) {
      return undefined;
    }

    return {
      summary: candidate.summary,
      warnings: candidate.warnings ?? null,
    };
  }, [logInterpretations, selectedLog]);
  const selectedLogSubtitle = selectedLog?.message;

  const handleOpenDetails = React.useCallback(
    (log: SystemLogRecord): void => {
      setSelectedLog(log);
      if (!logInterpretations[log.id] && !interpretLogMutation.isPending) {
        interpretLogMutation.mutate(log.id);
      }
    },
    [interpretLogMutation, logInterpretations]
  );

  const columns = React.useMemo<ColumnDef<SystemLogRecord>[]>(
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
          <span className='font-mono text-xs text-gray-500'>
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
            <div className='flex max-w-[500px] flex-col gap-1'>
              <Tooltip content={row.original.message} className='w-full'>
                <span
                  className='block truncate rounded-sm text-sm font-medium text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
                  tabIndex={0}
                  aria-label={row.original.message}
                  title={row.original.message}
                >
                  {row.original.message}
                </span>
              </Tooltip>
              {(row.original.path || row.original.method) ? (
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-[10px] text-gray-500'>
                    {row.original.method ? (
                      <span className='mr-1 text-sky-400'>{row.original.method}</span>
                    ) : null}
                    {row.original.path}
                  </span>
                  {row.original.statusCode ? (
                    <StatusBadge
                      status={String(row.original.statusCode)}
                      variant={row.original.statusCode >= 400 ? 'error' : 'success'}
                      size='sm'
                      className='h-4 font-bold'
                    />
                  ) : null}
                </div>
              ) : null}
              {(primaryContextDocument || alertEvidence) ? (
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
              ) : null}
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
              {isAlert ? <AlertTriangle className='size-3 text-amber-400' /> : null}
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
                onClick={() => handleOpenDetails(row.original)}
                aria-label='View details'
                title='View details'
              >
                <Eye className='size-3.5' />
              </Button>
            </Tooltip>
          </div>
        ),
      },
    ],
    [aiInterpretationTooltip, handleOpenDetails]
  );

  return (
    <>
      <StandardDataTablePanel
        footer={
          showFooterPagination ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              variant='compact'
            />
          ) : undefined
        }
        isLoading={logsQuery.isLoading}
        variant='flat'
        columns={columns}
        data={logs}
        maxHeight='60vh'
        stickyHeader
        enableVirtualization={true}
      />
      <DetailModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title='Log details'
        subtitle={selectedLogSubtitle}
        size='xl'
      >
        {selectedLog ? (
          renderSystemLogDetailsContent({
            log: selectedLog,
            interpretation: selectedInterpretation,
            isInterpreting: interpretLogMutation.isPending && !selectedInterpretation,
            onFilterChange: handleFilterChange,
          })
        ) : null}
      </DetailModal>
    </>
  );
}
