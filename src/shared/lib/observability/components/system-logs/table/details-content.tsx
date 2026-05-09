import React from 'react';
import { Monitor, SearchIcon } from 'lucide-react';

import { StatusBadge } from '@/shared/ui/data-display.public';
import { Alert, Button, Card } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import { formatTimestamp } from '@/shared/lib/observability/utils/formatTimestamp';
import {
  getLogCategory,
  getStatusVariant,
  readAlertEvidence,
  readContextString,
  readLogContextRegistry,
} from '@/shared/lib/observability/utils/logHelpers';
import { ContextDocumentCard, ContextRegistryNodesCard } from '../SystemLogs.Table';

export function renderSystemLogDetailsContent({
  log,
  interpretation,
  isInterpreting,
  onGenerateInterpretation,
  onFilterChange,
}: {
  log: SystemLogRecord;
  interpretation?: { summary: string; warnings?: string[] | null };
  isInterpreting: boolean;
  onGenerateInterpretation: () => void;
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

      {!interpretation && !isInterpreting ? (
        <Card variant='glass' padding='md' className='space-y-3 bg-sky-950/20'>
          <div className='flex items-center justify-between gap-3'>
            <Hint uppercase variant='muted' className='font-semibold'>
              AI Interpretation
            </Hint>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onGenerateInterpretation}
            >
              Generate interpretation
            </Button>
          </div>
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
