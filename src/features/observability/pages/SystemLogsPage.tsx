'use client';

import {
  AlertTriangle,
  Copy,
  Link2,
  Monitor,
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
  type SystemLogFilterFormValues,
} from '@/shared/lib/observability/log-triage-presets';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import {
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';
import {
  Button,
  DynamicFilters,
  StandardDataTablePanel,
  Pagination,
  StatusBadge,
  PageLayout,
  Alert,
  MetadataItem,
  Tooltip,
  CopyButton,
  Hint,
  Card,
  type StatusVariant,
  LoadingState,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { ColumnDef } from '@tanstack/react-table';
import { LogDiagnostics } from '../components/LogDiagnostics';
import { LogMetrics } from '../components/LogMetrics';
import { AiLogInterpreter } from '../components/AiLogInterpreter';
import { LogTriagePresets } from '../components/LogTriagePresets';
import { formatTimestamp } from '../utils/formatTimestamp';

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
  label: string;
  value: string;
};

type ContextDocumentSectionDisplay = {
  id: string | null;
  kind: string | null;
  title: string;
  summary: string | null;
  text: string | null;
  items: Array<Record<string, string>>;
};

type ContextDocumentDisplay = {
  id: string;
  entityType: string | null;
  title: string;
  summary: string | null;
  status: string | null;
  tags: string[];
  facts: AiPathRunDisplayModel[];
  sections: ContextDocumentSectionDisplay[];
};

type ContextRegistryNodeDisplay = {
  id: string;
  kind: string | null;
  name: string;
};

type ContextRegistryDisplay = {
  refs: string[];
  documents: ContextDocumentDisplay[];
  nodes: ContextRegistryNodeDisplay[];
};

type AlertEvidenceSampleDisplay = {
  logId: string | null;
  createdAt: string | null;
  level: string | null;
  source: string | null;
  message: string | null;
  fingerprint: string | null;
  contextRegistry: ContextRegistryDisplay | null;
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

const toDisplayValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    const formatted = value.map((item) => toDisplayValue(item)).filter((item): item is string => Boolean(item));
    return formatted.length > 0 ? formatted.join(', ') : null;
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
};

const readContextDocument = (value: unknown): ContextDocumentDisplay | null => {
  const record = asRecord(value);
  const id = readRecordString(record?.['id']);
  const title = readRecordString(record?.['title']);
  if (!id || !title) return null;

  const factsRecord = asRecord(record?.['facts']);
  const sections = Array.isArray(record?.['sections']) ? record?.['sections'] : [];

  return {
    id,
    entityType: readRecordString(record?.['entityType']),
    title,
    summary: readRecordString(record?.['summary']),
    status: readRecordString(record?.['status']),
    tags: Array.isArray(record?.['tags'])
      ? record['tags']
        .map((tag) => readRecordString(tag))
        .filter((tag): tag is string => Boolean(tag))
        .slice(0, 6)
      : [],
    facts: factsRecord
      ? Object.entries(factsRecord)
        .map(([key, rawValue]) => {
          const value = toDisplayValue(rawValue);
          return value ? { label: key, value } : null;
        })
        .filter((entry): entry is AiPathRunDisplayModel => Boolean(entry))
      : [],
    sections: sections
      .map((section): ContextDocumentSectionDisplay | null => {
        const sectionRecord = asRecord(section);
        const sectionTitle = readRecordString(sectionRecord?.['title']);
        if (!sectionTitle) return null;
        const items = Array.isArray(sectionRecord?.['items']) ? sectionRecord?.['items'] : [];

        return {
          id: readRecordString(sectionRecord?.['id']),
          kind: readRecordString(sectionRecord?.['kind']),
          title: sectionTitle,
          summary: readRecordString(sectionRecord?.['summary']),
          text: readRecordString(sectionRecord?.['text']),
          items: items
            .map((item) => {
              const itemRecord = asRecord(item);
              if (!itemRecord) return null;
              const normalized = Object.fromEntries(
                Object.entries(itemRecord)
                  .map(([key, rawValue]) => [key, toDisplayValue(rawValue)])
                  .filter((entry): entry is [string, string] => Boolean(entry[1]))
              );
              return Object.keys(normalized).length > 0 ? normalized : null;
            })
            .filter((item): item is Record<string, string> => Boolean(item))
            .slice(0, 6),
        };
      })
      .filter((section): section is ContextDocumentSectionDisplay => Boolean(section)),
  };
};

const readContextRegistryNode = (value: unknown): ContextRegistryNodeDisplay | null => {
  const record = asRecord(value);
  const id = readRecordString(record?.['id']);
  const name = readRecordString(record?.['name']);
  if (!id || !name) return null;

  return {
    id,
    kind: readRecordString(record?.['kind']),
    name,
  };
};

const readContextRegistryDisplay = (value: unknown): ContextRegistryDisplay | null => {
  const contextRegistry = asRecord(value);
  if (!contextRegistry) return null;

  const refs = Array.isArray(contextRegistry['refs']) ? contextRegistry['refs'] : [];
  const resolved = asRecord(contextRegistry['resolved']);
  const documents = Array.isArray(resolved?.['documents']) ? resolved?.['documents'] : [];
  const nodes = Array.isArray(resolved?.['nodes']) ? resolved?.['nodes'] : [];

  return {
    refs: refs
      .map((ref) => readRecordString(asRecord(ref)?.['id']))
      .filter((ref): ref is string => Boolean(ref)),
    documents: documents
      .map((document) => readContextDocument(document))
      .filter((document): document is ContextDocumentDisplay => Boolean(document)),
    nodes: nodes
      .map((node) => readContextRegistryNode(node))
      .filter((node): node is ContextRegistryNodeDisplay => Boolean(node)),
  };
};

const readLogContextRegistry = (log: SystemLogRecord): ContextRegistryDisplay | null => {
  const context = asRecord(log.context);
  return readContextRegistryDisplay(context?.['contextRegistry']);
};

const readAlertEvidenceSample = (value: unknown): AlertEvidenceSampleDisplay | null => {
  const record = asRecord(value);
  if (!record) return null;

  return {
    logId: readRecordString(record['logId']),
    createdAt: readRecordString(record['createdAt']),
    level: readRecordString(record['level']),
    source: readRecordString(record['source']),
    message: readRecordString(record['message']),
    fingerprint: readRecordString(record['fingerprint']),
    contextRegistry: readContextRegistryDisplay(record['contextRegistry']),
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

const getPrimaryContextDocument = (
  contextRegistry: ContextRegistryDisplay | null
): ContextDocumentDisplay | null => contextRegistry?.documents[0] ?? null;

function ContextDocumentCard({
  document,
  accentClassName = 'bg-sky-950/20',
}: {
  document: ContextDocumentDisplay;
  accentClassName?: string;
}): React.JSX.Element {
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
        {document.tags.map((tag) => (
          <StatusBadge key={`${document.id}-${tag}`} status={tag} variant='neutral' size='sm' />
        ))}
      </div>
      <div className='space-y-1'>
        <p className='text-sm font-semibold text-gray-100'>{document.title}</p>
        {document.summary ? <p className='text-[11px] text-gray-300/90'>{document.summary}</p> : null}
      </div>
      {document.facts.length ? (
        <div className='grid grid-cols-2 gap-2'>
          {document.facts.map((fact) => (
            <MetadataItem key={`${document.id}-${fact.label}`} label={fact.label} value={fact.value} mono />
          ))}
        </div>
      ) : null}
      {document.sections.map((section) => (
        <div key={`${document.id}-${section.id ?? section.title}`}>
          <Hint uppercase variant='muted' className='mb-2 text-[10px] font-semibold'>
            {section.title}
          </Hint>
          {section.summary ? <p className='mb-2 text-[11px] text-gray-300/80'>{section.summary}</p> : null}
          {section.text ? (
            <p className='mb-2 rounded border border-white/5 bg-black/20 px-3 py-2 text-[11px] text-gray-200/90'>
              {section.text}
            </p>
          ) : null}
          {section.items.length ? (
            <div className='space-y-2'>
              {section.items.map((item, index) => (
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

function ContextRegistryNodesCard({
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

const getLogCategory = (log: SystemLogRecord): string | null => {
  return typeof log.category === 'string' && log.category.trim().length > 0
    ? log.category
    : readContextString(log, 'category');
};





function EventStreamPanel(): React.JSX.Element {
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
          const contextRegistry = readLogContextRegistry(row.original);
          const primaryContextDocument = getPrimaryContextDocument(contextRegistry);
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
              {(primaryContextDocument || alertEvidence) && (
                <div className='flex flex-wrap items-center gap-1.5 pt-1'>
                  {primaryContextDocument ? (
                    <>
                      <StatusBadge status='Context' variant='info' size='sm' className='h-4' />
                      <span className='text-[10px] text-sky-200/80'>{primaryContextDocument.title}</span>
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
                  {(log.requestId || log.traceId || log.correlationId || log.service || log.userId || fingerprint) && (
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
                          onClick={() => handleFilterChange('correlationId', log.correlationId ?? '')}
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

function SystemLogsContent(): React.JSX.Element {
  const {
    filterFields,
    level,
    query,
    source,
    service,
    method,
    statusCode,
    requestId,
    traceId,
    correlationId,
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
    service,
    method,
    statusCode,
    requestId,
    traceId,
    correlationId,
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
              service ||
              method ||
              statusCode ||
              requestId ||
              traceId ||
              correlationId ||
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

        <EventStreamPanel />
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
