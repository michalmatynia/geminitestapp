import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  RuntimeHistoryEntry,
} from '@/shared/lib/ai-paths';
import {
  Alert,
  Button,
  SelectSimple,
  StatusBadge,
  Textarea,
  FormField,
  CollapsibleSection,
  LoadingState,
  CompactEmptyState,
} from '@/shared/ui';

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
import { extractPlaywrightArtifactsFromNode } from './playwright-artifacts';
import { resolveRunHistoryEntryAction } from './run-history-entry-actions';
import { buildHistoryNodeOptions } from './run-history-utils';
import { RunHistoryEntries } from './RunHistoryEntries';

type HistoryOption = {
  id: string;
  label: string;
};

type JobQueueRunCardProps = {
  runId: string;
  run: AiPathRunRecord;
};

type RunCoordinationNotice = {
  variant: 'warning' | 'info';
  title: string;
  description: string;
  detail?: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const resolveRunCoordinationNotice = (
  run: AiPathRunRecord
): RunCoordinationNotice | null => {
  const meta = asRecord(run.meta);

  if (run.status === 'blocked_on_lease') {
    const executionLease = asRecord(meta?.['executionLease']);
    const ownerAgentId =
      typeof executionLease?.['ownerAgentId'] === 'string'
        ? executionLease['ownerAgentId'].trim()
        : '';
    const ownerRunId =
      typeof executionLease?.['ownerRunId'] === 'string'
        ? executionLease['ownerRunId'].trim()
        : '';
    const ownerSummary =
      ownerAgentId.length > 0
        ? `Current owner: ${ownerAgentId}${ownerRunId.length > 0 ? ` (${ownerRunId})` : ''}.`
        : 'Wait for the active owner to release the execution lease or hand the run off.';

    return {
      variant: 'warning',
      title: 'Execution lease blocked',
      description:
        'This run cannot continue until its execution lease is released or another operator takes over.',
      detail: ownerSummary,
    };
  }

  if (run.status === 'handoff_ready') {
    const handoff = asRecord(meta?.['handoff']);
    const reason =
      typeof handoff?.['reason'] === 'string' ? handoff['reason'].trim() : '';
    const checkpointLineageId =
      typeof handoff?.['checkpointLineageId'] === 'string'
        ? handoff['checkpointLineageId'].trim()
        : '';

    return {
      variant: 'info',
      title: 'Ready for delegated continuation',
      description:
        reason.length > 0
          ? reason
          : 'This run was prepared for another agent or operator to continue from the recorded checkpoint lineage.',
      detail:
        checkpointLineageId.length > 0
          ? `Checkpoint lineage: ${checkpointLineageId}`
          : 'Resume this run when the next owner is ready to continue.',
    };
  }

  return null;
};

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
    handleResumeRun,
    handleHandoffRun,
    handleRetryRunNode,
    handleCancelRun,
    setRunToDelete,
    setHistorySelection,
  } = useJobQueueActions();
  const [isMarkingHandoff, setIsMarkingHandoff] = React.useState(false);
  const [handoffRequested, setHandoffRequested] = React.useState(false);

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
  const canCancel = ['queued', 'running', 'paused'].includes(detailRun.status);

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
  const onHandoffRun = () => {
    setIsMarkingHandoff(true);
    setHandoffRequested(false);
    void handleHandoffRun(detailRun.id)
      .then((ok: boolean) => {
        setHandoffRequested(ok);
      })
      .finally(() => {
        setIsMarkingHandoff(false);
      });
  };
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
  const coordinationNotice = React.useMemo(
    (): RunCoordinationNotice | null => resolveRunCoordinationNotice(detailRun),
    [detailRun]
  );

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
              status={'Origin: ' + getOriginLabel(runOrigin)}
              variant={getOriginVariant(runOrigin)}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={'Run: ' + getExecutionLabel(runExecution)}
              variant={getExecutionVariant(runExecution)}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={'Source: ' + runSource}
              variant='neutral'
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={'Debug: ' + runSourceDebug}
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
          {coordinationNotice ? (
            <Alert variant={coordinationNotice.variant} className='mt-2 px-2 py-1 text-[11px]'>
              <div className='font-semibold text-white'>{coordinationNotice.title}</div>
              <div>{coordinationNotice.description}</div>
              {coordinationNotice.detail ? (
                <div className='mt-1 text-[10px] text-current/80'>{coordinationNotice.detail}</div>
              ) : null}
              {detailRun.status === 'blocked_on_lease' && handoffRequested ? (
                <div className='mt-1 text-[10px] text-current/80'>
                  Handoff requested. Refreshing status...
                </div>
              ) : null}
            </Alert>
          ) : null}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onToggleRun}
          >
            {isExpanded ? 'Hide details' : 'Details'}
          </Button>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onToggleStream}
            disabled={!isExpanded}
          >
            {paused ? 'Resume stream' : 'Pause stream'}
          </Button>
          <Button
            type='button'
            className='rounded-md border px-2 py-1 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onRefreshDetail}
            disabled={detailLoading}
          >
            {detailLoading ? 'Loading...' : 'Refresh detail'}
          </Button>
          {detailRun.status === 'blocked_on_lease' ? (
            <Button
              type='button'
              variant='outline'
              className='rounded-md border px-2 py-1 text-[10px] text-blue-200 hover:bg-blue-500/10'
              onClick={onHandoffRun}
              disabled={isMarkingHandoff}
            >
              {isMarkingHandoff ? 'Marking...' : 'Mark handoff-ready'}
            </Button>
          ) : null}
          <Button
            type='button'
            variant='outline'
            className='rounded-md border px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/10'
            onClick={onCancelRun}
            disabled={!canCancel || isCancellingThisRun}
          >
            {isCancellingThisRun ? 'Canceling...' : 'Cancel'}
          </Button>
          <Button
            type='button'
            variant='destructive'
            className='rounded-md border px-2 py-1 text-[10px]'
            onClick={onDeleteRun}
            disabled={isDeletingThisRun}
          >
            {isDeletingThisRun ? 'Deleting...' : 'Delete'}
          </Button>
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
                <div>
                  <span className='uppercase text-gray-500'>Path ID</span>
                  <div className='text-white'>{detailRun.pathId ?? '-'}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Status</span>
                  <div className='text-white'>{detailRun.status}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Trigger</span>
                  <div className='text-white'>{detailRun.triggerEvent ?? '-'}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Origin</span>
                  <div className='text-white'>{getOriginLabel(runOrigin)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Run type</span>
                  <div className='text-white'>{getExecutionLabel(runExecution)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Source</span>
                  <div className='text-white'>{runSource}</div>
                </div>
                <div className='sm:col-span-2 lg:col-span-3'>
                  <span className='uppercase text-gray-500'>Source debug</span>
                  <div className='font-mono text-sky-200'>{runSourceDebug}</div>
                </div>
                <div className='sm:col-span-2 lg:col-span-3'>
                  <span className='uppercase text-gray-500'>Runtime fingerprint</span>
                  <div className='font-mono text-sky-200'>{runtimeFingerprint ?? 'n/a'}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Started</span>
                  <div className='text-white'>{formatDate(detailRun.startedAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Finished</span>
                  <div className='text-white'>{formatDate(detailRun.finishedAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Dead-lettered</span>
                  <div className='text-white'>{formatDate(detailRun.deadLetteredAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Retry</span>
                  <div className='text-white'>
                    {detailRun.retryCount ?? 0}/{detailRun.maxAttempts ?? '-'}
                  </div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Next retry</span>
                  <div className='text-white'>{formatDate(detailRun.nextRetryAt)}</div>
                </div>
                <div>
                  <span className='uppercase text-gray-500'>Trigger node</span>
                  <div className='text-white'>{detailRun.triggerNodeId ?? '-'}</div>
                </div>
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
                    onReplayFromEntry={(entry): void => {
                      const action = resolveRunHistoryEntryAction(entry);
                      if (action.kind === 'retry_node') {
                        void handleRetryRunNode(detailRun.id, entry.nodeId).catch(() => {});
                        return;
                      }
                      void handleResumeRun(detailRun.id, action.resumeMode ?? 'replay').catch(
                        () => {}
                      );
                    }}
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
                            <div>
                              <span className='uppercase text-gray-500'>Started</span>
                              <div className='text-white'>{formatDate(node.startedAt)}</div>
                            </div>
                            <div>
                              <span className='uppercase text-gray-500'>Finished</span>
                              <div className='text-white'>{formatDate(node.finishedAt)}</div>
                            </div>
                            <div>
                              <span className='uppercase text-gray-500'>Attempt</span>
                              <div className='text-white'>{node.attempt}</div>
                            </div>
                          </div>
                          {node.errorMessage ? (
                            <div className='mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200'>
                              Error: {node.errorMessage}
                            </div>
                          ) : null}
                          <div className='mt-3 grid gap-3 lg:grid-cols-2'>
                            <FormField label='Inputs'>
                              <Textarea
                                className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                readOnly
                                value={safePrettyJson(node.inputs)}
                               aria-label='Inputs' title='Inputs'/>
                            </FormField>
                            <FormField label='Outputs'>
                              <Textarea
                                className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                                readOnly
                                value={safePrettyJson(node.outputs)}
                               aria-label='Outputs' title='Outputs'/>
                            </FormField>
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
                                    {artifact.name}
                                    {artifact.kind ? ` (${artifact.kind})` : ''}
                                  </a>
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
                      <div key={event.id} className='py-2'>
                        <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-400'>
                          <span>{formatDate(event.createdAt)}</span>
                          <span className='rounded-full border px-2 py-0.5 text-[10px] text-gray-300'>
                            {event.level}
                          </span>
                        </div>
                        <div className='mt-1 text-sm text-white'>{event.message}</div>
                        {event.metadata ? (
                          <pre className='mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                            {safePrettyJson(event.metadata)}
                          </pre>
                        ) : null}
                      </div>
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
                  <FormField label='Inputs'>
                    <Textarea
                      className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(
                        (detailRun.runtimeState as Record<string, unknown>)?.['inputs']
                      )}
                     aria-label='Inputs' title='Inputs'/>
                  </FormField>
                  <FormField label='Outputs'>
                    <Textarea
                      className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(
                        (detailRun.runtimeState as Record<string, unknown>)?.['outputs']
                      )}
                     aria-label='Outputs' title='Outputs'/>
                  </FormField>
                </div>
                <div className='mt-3'>
                  <FormField label='Hashes'>
                    <Textarea
                      className='mt-1 min-h-[80px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(
                        (detailRun.runtimeState as Record<string, unknown>)?.['hashes']
                      )}
                     aria-label='Hashes' title='Hashes'/>
                  </FormField>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Graph snapshot</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <Textarea
                  className='mt-1 min-h-[160px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                  readOnly
                  value={safePrettyJson(detailRun.graph)}
                  aria-label='Graph snapshot'
                 title='Textarea'/>
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Raw payloads</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <div className='mt-1 space-y-3'>
                  <FormField label='Run'>
                    <Textarea
                      className='mt-1 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(detailRun)}
                     aria-label='Run' title='Run'/>
                  </FormField>
                  <FormField label='Nodes'>
                    <Textarea
                      className='mt-1 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(nodes)}
                     aria-label='Nodes' title='Nodes'/>
                  </FormField>
                  <FormField label='Events'>
                    <Textarea
                      className='mt-1 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                      readOnly
                      value={safePrettyJson(events)}
                     aria-label='Events' title='Events'/>
                  </FormField>
                </div>
              </CollapsibleSection>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
