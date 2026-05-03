'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AiPathRunEventRecord, AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { Alert, Textarea, CollapsibleSection } from '@/shared/ui/primitives.public';
import { SelectSimple, FormField } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { LoadingState, CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';

import {
  formatDate,
  formatUtcDateTime,
  getExecutionLabel,
  getExecutionVariant,
  getOriginLabel,
  getOriginVariant,
  safePrettyJson,
  normalizeRunDetail,
  isRunningStatus,
  resolveRunOrigin,
  resolveRunExecutionKind,
  resolveRunSource,
  resolveRunSourceDebug,
  normalizeRunNodes,
  normalizeRunEvents,
  type StreamConnectionStatus,
} from './job-queue-panel-utils';
import { RunningIndicator } from './job-queue-running-indicator';
import { useJobQueueActions, useJobQueueState } from './JobQueueContext';
import {
  extractPlaywrightArtifactsFromNode,
  extractPlaywrightRuntimePostureFromNode,
  formatPlaywrightRuntimePostureBrowser,
  formatPlaywrightRuntimePostureIdentity,
  formatPlaywrightRuntimePostureProxy,
  formatPlaywrightRuntimePostureStickyState,
  resolvePlaywrightArtifactDisplayName,
} from './playwright-artifacts';
import { buildHistoryNodeOptions } from './run-history-utils';
import { AiPathsPillButton } from './AiPathsPillButton';
import { RunHistoryEntries } from './RunHistoryEntries';
import { renderRuntimeEventEntry } from './runtime-event-entry';

type HistoryOption = {
  id: string;
  label: string;
};

type JobQueueRunCardProps = {
  runId: string;
  run: AiPathRunRecord;
};

type JobQueueDetailFieldProps = {
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
};

type JobQueueJsonTextareaProps = {
  value: unknown;
  minHeightClassName?: string;
  ariaLabel: string;
  title?: string;
};

type JobQueueJsonFieldProps = JobQueueJsonTextareaProps & {
  label: string;
};

const jobQueueJsonTextareaClassName =
  'mt-1 w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200';

const renderJobQueueDetailField = ({
  label,
  value,
  className,
  valueClassName,
}: JobQueueDetailFieldProps): React.JSX.Element => (
  <div className={className}>
    <span className='uppercase text-gray-500'>{label}</span>
    <div className={valueClassName ?? 'text-white'}>{value}</div>
  </div>
);

const renderJobQueueJsonTextarea = ({
  value,
  minHeightClassName = 'min-h-[120px]',
  ariaLabel,
  title,
}: JobQueueJsonTextareaProps): React.JSX.Element => (
  <Textarea
    className={[jobQueueJsonTextareaClassName, minHeightClassName].join(' ')}
    readOnly
    value={safePrettyJson(value)}
    aria-label={ariaLabel}
    title={title ?? ariaLabel}
  />
);

const renderJobQueueJsonField = ({
  label,
  value,
  minHeightClassName,
  ariaLabel,
  title,
}: JobQueueJsonFieldProps): React.JSX.Element => (
  <FormField label={label}>
    {renderJobQueueJsonTextarea({
      value,
      minHeightClassName,
      ariaLabel,
      title,
    })}
  </FormField>
);

export function JobQueueRunCard({ runId, run }: JobQueueRunCardProps): React.JSX.Element {
  const {
    expandedRunIds,
    runDetails,
    runDetailLoading,
    runDetailErrors,
    pausedStreams,
    streamStatuses,
    isCancelingRun,
    isDeletingRun,
    historySelection,
  } = useJobQueueState();
  const {
    toggleRun,
    toggleStream,
    loadRunDetail,
    handleCancelRun,
    setRunToDelete,
    setHistorySelection,
  } = useJobQueueActions();

  const isExpanded = expandedRunIds.has(runId);
  const detail = normalizeRunDetail(runDetails[runId]);
  const detailLoading = runDetailLoading.has(runId);
  const detailError = runDetailErrors[runId];
  const detailRun = detail?.run ?? run;
  const isRunning = isRunningStatus(detailRun.status);
  const isScheduledRun = detailRun.triggerEvent === 'scheduled_run';
  const streamStatus: StreamConnectionStatus = pausedStreams.has(runId)
    ? 'paused'
    : (streamStatuses[runId] ?? 'stopped');
  const canCancel = ['queued', 'running'].includes(detailRun.status);

  const nodes = normalizeRunNodes(detail?.nodes);
  const events = normalizeRunEvents(detail?.events);
  const history = (
    detailRun.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | undefined
  )?.history;
  const historyOptions = buildHistoryNodeOptions(history, nodes, detailRun.graph?.nodes ?? null);
  const historySelectOptions = React.useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      historyOptions.map((option: HistoryOption) => ({
        value: option.id,
        label: option.label,
      })),
    [historyOptions]
  );

  const selectedHistoryNodeId = React.useMemo(() => {
    if (!historyOptions.length) return null;
    const existing = historySelection[runId];
    if (existing && historyOptions.some((option: { id: string }) => option.id === existing))
      return existing;
    return historyOptions[0]?.id ?? null;
  }, [historyOptions, historySelection, runId]);

  const historyEntries =
    selectedHistoryNodeId && history ? (history[selectedHistoryNodeId] ?? []) : [];

  const onToggleRun = () => toggleRun(runId);
  const onToggleStream = () => toggleStream(runId);
  const onRefreshDetail = () => void loadRunDetail(runId);
  const onCancelRun = () => void handleCancelRun(runId);
  const onDeleteRun = () => setRunToDelete(detailRun);
  const onSelectHistoryNode = (val: string) => setHistorySelection(runId, val);

  const runtimeFingerprint = React.useMemo((): string | null => {
    if (!detailRun.meta || typeof detailRun.meta !== 'object') return null;
    const raw = detailRun.meta['runtimeFingerprint'];
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [detailRun.meta]);

  const runOrigin = resolveRunOrigin(detailRun);
  const runExecution = resolveRunExecutionKind(detailRun);
  const runSource = resolveRunSource(detailRun) ?? 'unknown';
  const runSourceDebug = resolveRunSourceDebug(detailRun);
  const isCancellingThisRun = isCancelingRun(runId);
  const isDeletingThisRun = isDeletingRun(runId);
  const paused = pausedStreams.has(runId);

  return (
    <div className='rounded-md border border-border/60 bg-card/70 p-3 text-xs text-gray-300'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            {isRunning ? (
              <RunningIndicator />
            ) : (
              <StatusBadge status={detailRun.status} size='sm' className='font-bold' />
            )}
          </div>
          {isScheduledRun ? (
            <div className='mt-1'>
              <StatusBadge status='Scheduled' variant='warning' size='sm' className='font-bold' />
            </div>
          ) : null}
          <div className='mt-1 flex flex-wrap items-center gap-1'>
            <StatusBadge
              status={`Origin: ${  getOriginLabel(runOrigin)}`}
              variant={getOriginVariant(runOrigin)}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={`Run: ${  getExecutionLabel(runExecution)}`}
              variant={getExecutionVariant(runExecution)}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={`Source: ${  runSource}`}
              variant='neutral'
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={`Debug: ${  runSourceDebug}`}
              variant='info'
              size='sm'
              title={runSourceDebug}
              className='font-medium'
            />
          </div>
          <div className='text-sm text-white'>{detailRun.pathName ?? 'AI Path'}</div>
          <div className='text-[11px] text-gray-400'>
            Run ID: <span className='font-mono'>{detailRun.id}</span>
          </div>
          <div className='text-[11px] text-gray-500'>
            Created {formatUtcDateTime(detailRun.createdAt)}
          </div>
          <div className='text-[11px] text-gray-500'>Stream: {streamStatus}</div>
          {(detailRun.entityType || detailRun.entityId) && (
            <div className='text-[11px] text-gray-500'>
              Entity: {detailRun.entityType ?? '?'} {detailRun.entityId ?? ''}
            </div>
          )}
          {detailRun.errorMessage && (
            <Alert variant='error' className='mt-1 px-2 py-1 text-[11px]'>
              Error: {detailRun.errorMessage}
            </Alert>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <AiPathsPillButton
            className='text-gray-200 hover:bg-muted/60'
            onClick={onToggleRun}
          >
            {isExpanded ? 'Hide details' : 'Details'}
          </AiPathsPillButton>
          <AiPathsPillButton
            className='text-gray-200 hover:bg-muted/60'
            onClick={onToggleStream}
            disabled={!isExpanded}
          >
            {paused ? 'Reconnect stream' : 'Pause stream'}
          </AiPathsPillButton>
          <AiPathsPillButton
            className='text-gray-200 hover:bg-muted/60'
            onClick={onRefreshDetail}
            disabled={detailLoading}
          >
            {detailLoading ? 'Loading...' : 'Refresh detail'}
          </AiPathsPillButton>
          <AiPathsPillButton
            variant='outline'
            inactiveClassName='text-amber-200 hover:bg-amber-500/10'
            onClick={onCancelRun}
            disabled={!canCancel || isCancellingThisRun}
          >
            {isCancellingThisRun ? 'Canceling...' : 'Cancel'}
          </AiPathsPillButton>
          <AiPathsPillButton
            variant='destructive'
            inactiveClassName=''
            onClick={onDeleteRun}
            disabled={isDeletingThisRun}
          >
            {isDeletingThisRun ? 'Deleting...' : 'Delete'}
          </AiPathsPillButton>
        </div>
      </div>

      {isExpanded ? (
        <div className='mt-4 space-y-3'>
          {detailError ? (
            <div className='rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200'>
              {detailError}
            </div>
          ) : null}

          {!detail && detailLoading ? (
            <LoadingState message='Loading run details...' size='sm' className='py-4' />
          ) : null}

          {detail ? (
            <>
              <div className='grid gap-3 text-[11px] text-gray-400 sm:grid-cols-2 lg:grid-cols-3'>
                {renderJobQueueDetailField({ label: 'Path ID', value: detailRun.pathId ?? '-' })}
                {renderJobQueueDetailField({ label: 'Status', value: detailRun.status })}
                {renderJobQueueDetailField({
                  label: 'Trigger',
                  value: detailRun.triggerEvent ?? '-',
                })}
                {renderJobQueueDetailField({
                  label: 'Origin',
                  value: getOriginLabel(runOrigin),
                })}
                {renderJobQueueDetailField({
                  label: 'Run type',
                  value: getExecutionLabel(runExecution),
                })}
                {renderJobQueueDetailField({ label: 'Source', value: runSource })}
                {renderJobQueueDetailField({
                  label: 'Source debug',
                  value: runSourceDebug,
                  className: 'sm:col-span-2 lg:col-span-3',
                  valueClassName: 'font-mono text-sky-200',
                })}
                {renderJobQueueDetailField({
                  label: 'Runtime fingerprint',
                  value: runtimeFingerprint ?? 'n/a',
                  className: 'sm:col-span-2 lg:col-span-3',
                  valueClassName: 'font-mono text-sky-200',
                })}
                {renderJobQueueDetailField({
                  label: 'Started',
                  value: formatDate(detailRun.startedAt),
                })}
                {renderJobQueueDetailField({
                  label: 'Finished',
                  value: formatDate(detailRun.finishedAt),
                })}
                {renderJobQueueDetailField({
                  label: 'Trigger node',
                  value: detailRun.triggerNodeId ?? '-',
                })}
              </div>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Run history</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                {historyOptions.length > 1 ? (
                  <div className='mt-1 flex flex-wrap items-center gap-2'>
                    <FormField label='Node' className='flex-1'>
                      <SelectSimple
                        size='sm'
                        value={selectedHistoryNodeId || ''}
                        onValueChange={onSelectHistoryNode}
                        options={historySelectOptions}
                        placeholder='Select node'
                        triggerClassName='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'
                       ariaLabel='Select node' title='Select node'/>
                    </FormField>
                  </div>
                ) : (
                  <div className='mt-1 text-[11px] text-gray-500'>
                    {historyOptions[0]?.label ?? 'No history nodes'}
                  </div>
                )}
                <div className='mt-3'>
                  <RunHistoryEntries
                    entries={historyEntries}
                    emptyMessage='No history recorded for this run.'
                    showNodeLabel
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={
                  <span className='text-[11px] uppercase text-gray-400'>
                    Nodes ({nodes.length})
                  </span>
                }
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                {nodes.length === 0 ? (
                  <CompactEmptyState
                    title='No nodes recorded'
                    description='No node execution details were captured for this run.'
                    className='border-none bg-transparent py-4'
                   />
                ) : (
                  <div className='mt-1 space-y-2'>
                    {nodes.map((node: AiPathRunNodeRecord) => {
                      const artifactLinks = extractPlaywrightArtifactsFromNode(node);
                      const runtimePosture = extractPlaywrightRuntimePostureFromNode(node);
                      return (
                        <CollapsibleSection
                          key={node.id}
                          title={
                            <span className='text-[11px] text-gray-300'>
                              {node.nodeTitle ?? node.nodeId}{' '}
                              {node.nodeType ? `(${node.nodeType})` : ''}
                              <span className='ml-2 text-gray-500'>{node.status}</span>
                            </span>
                          }
                          className='border-border/60 bg-black/30'
                          variant='subtle'
                        >
                          <div className='mt-1 grid gap-2 text-[11px] text-gray-400 sm:grid-cols-2 lg:grid-cols-3'>
                            {renderJobQueueDetailField({
                              label: 'Started',
                              value: formatDate(node.startedAt),
                            })}
                            {renderJobQueueDetailField({
                              label: 'Finished',
                              value: formatDate(node.finishedAt),
                            })}
                            {renderJobQueueDetailField({
                              label: 'Attempt',
                              value: node.attempt,
                            })}
                          </div>
                          {node.errorMessage ? (
                            <div className='mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200'>
                              Error: {node.errorMessage}
                            </div>
                          ) : null}
                          <div className='mt-3 grid gap-3 lg:grid-cols-2'>
                            {renderJobQueueJsonField({
                              label: 'Inputs',
                              value: node.inputs,
                              ariaLabel: 'Inputs',
                            })}
                            {renderJobQueueJsonField({
                              label: 'Outputs',
                              value: node.outputs,
                              ariaLabel: 'Outputs',
                            })}
                          </div>
                          {artifactLinks.length > 0 ? (
                            <div className='mt-3 rounded-md border border-sky-500/30 bg-sky-500/5 p-2'>
                              <div className='text-[10px] uppercase tracking-wide text-sky-200'>
                                Playwright Artifacts
                              </div>
                              <div className='mt-2 flex flex-wrap gap-2'>
                                {artifactLinks.map((artifact, index) => (
                                  <a
                                    key={`${artifact.path}:${index}`}
                                    href={artifact.url ?? '#'}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='rounded border border-sky-400/40 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-100 hover:bg-sky-500/20 hover:underline'
                                    title={artifact.path}
                                  >
                                    {resolvePlaywrightArtifactDisplayName(artifact)}
                                    {artifact.kind ? ` (${artifact.kind})` : ''}
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {runtimePosture ? (
                            <div className='mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2'>
                              <div className='text-[10px] uppercase tracking-wide text-emerald-200'>
                                Runtime posture
                              </div>
                              <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                                {[
                                  {
                                    label: 'Browser',
                                    value: formatPlaywrightRuntimePostureBrowser(runtimePosture),
                                  },
                                  {
                                    label: 'Identity',
                                    value: formatPlaywrightRuntimePostureIdentity(runtimePosture),
                                  },
                                  {
                                    label: 'Proxy',
                                    value: formatPlaywrightRuntimePostureProxy(runtimePosture),
                                  },
                                  {
                                    label: 'Sticky state',
                                    value: formatPlaywrightRuntimePostureStickyState(runtimePosture),
                                  },
                                ]
                                  .filter(
                                    (entry): entry is { label: string; value: string } =>
                                      typeof entry.value === 'string' && entry.value.trim().length > 0
                                  )
                                  .map((entry) => (
                                    <div
                                      key={entry.label}
                                      className='rounded-md border border-emerald-500/20 bg-black/20 p-2'
                                    >
                                      <div className='text-[10px] uppercase tracking-wide text-emerald-200/80'>
                                        {entry.label}
                                      </div>
                                      <div className='mt-1 text-[11px] text-emerald-50'>
                                        {entry.value}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : null}
                        </CollapsibleSection>
                      );
                    })}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title={
                  <span className='text-[11px] uppercase text-gray-400'>
                    Events ({events.length})
                  </span>
                }
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                {events.length === 0 ? (
                  <CompactEmptyState
                    title='No events'
                    description='No runtime events were emitted during this execution.'
                    className='border-none bg-transparent py-4'
                   />
                ) : (
                  <div className='mt-1 divide-y divide-border/70'>
                    {events.map((event: AiPathRunEventRecord) => (
                      <React.Fragment key={event.id}>
                        {renderRuntimeEventEntry({
                          timestamp: formatDate(event.createdAt),
                          level: event.level,
                          kind: null,
                          message: event.message,
                          className: 'py-2',
                          timeClassName: 'text-gray-400',
                          levelClassName: 'text-gray-300',
                          messageClassName: 'text-sm text-white',
                          stacked: true,
                          hideKindBadge: true,
                          details: event.metadata ? (
                            <pre className='mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                              {safePrettyJson(event.metadata)}
                            </pre>
                          ) : null,
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Runtime state</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <div className='mt-1 grid gap-3 lg:grid-cols-2'>
                  {renderJobQueueJsonField({
                    label: 'Inputs',
                    value: (detailRun.runtimeState as Record<string, unknown>)?.['inputs'],
                    ariaLabel: 'Inputs',
                  })}
                  {renderJobQueueJsonField({
                    label: 'Outputs',
                    value: (detailRun.runtimeState as Record<string, unknown>)?.['outputs'],
                    ariaLabel: 'Outputs',
                  })}
                </div>
                <div className='mt-3'>
                  {renderJobQueueJsonField({
                    label: 'Hashes',
                    value: (detailRun.runtimeState as Record<string, unknown>)?.['hashes'],
                    minHeightClassName: 'min-h-[80px]',
                    ariaLabel: 'Hashes',
                  })}
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Graph snapshot</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                {renderJobQueueJsonTextarea({
                  value: detailRun.graph,
                  minHeightClassName: 'min-h-[160px]',
                  ariaLabel: 'Graph snapshot',
                })}
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Raw payloads</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <div className='mt-1 space-y-3'>
                  {renderJobQueueJsonField({
                    label: 'Run',
                    value: detailRun,
                    minHeightClassName: 'min-h-[140px]',
                    ariaLabel: 'Run',
                  })}
                  {renderJobQueueJsonField({
                    label: 'Nodes',
                    value: nodes,
                    minHeightClassName: 'min-h-[140px]',
                    ariaLabel: 'Nodes',
                  })}
                  {renderJobQueueJsonField({
                    label: 'Events',
                    value: events,
                    ariaLabel: 'Events',
                  })}
                </div>
              </CollapsibleSection>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
