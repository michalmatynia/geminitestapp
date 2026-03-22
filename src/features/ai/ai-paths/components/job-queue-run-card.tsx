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
import { AiPathsPillButton } from './AiPathsPillButton';
import { RunHistoryEntries } from './RunHistoryEntries';
import { RuntimeEventEntry } from './runtime-event-entry';

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

function JobQueueDetailField({
  label,
  value,
  className,
  valueClassName,
}: JobQueueDetailFieldProps): React.JSX.Element {
  return (
    <div className={className}>
      <span className='uppercase text-gray-500'>{label}</span>
      <div className={valueClassName ?? 'text-white'}>{value}</div>
    </div>
  );
}

function JobQueueJsonTextarea({
  value,
  minHeightClassName = 'min-h-[120px]',
  ariaLabel,
  title,
}: JobQueueJsonTextareaProps): React.JSX.Element {
  return (
    <Textarea
      className={[jobQueueJsonTextareaClassName, minHeightClassName].join(' ')}
      readOnly
      value={safePrettyJson(value)}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
    />
  );
}

function JobQueueJsonField({
  label,
  value,
  minHeightClassName,
  ariaLabel,
  title,
}: JobQueueJsonFieldProps): React.JSX.Element {
  return (
    <FormField label={label}>
      <JobQueueJsonTextarea
        value={value}
        minHeightClassName={minHeightClassName}
        ariaLabel={ariaLabel}
        title={title}
      />
    </FormField>
  );
}

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
            {paused ? 'Resume stream' : 'Pause stream'}
          </AiPathsPillButton>
          <AiPathsPillButton
            className='text-gray-200 hover:bg-muted/60'
            onClick={onRefreshDetail}
            disabled={detailLoading}
          >
            {detailLoading ? 'Loading...' : 'Refresh detail'}
          </AiPathsPillButton>
          {detailRun.status === 'blocked_on_lease' ? (
            <AiPathsPillButton
              variant='outline'
              inactiveClassName='text-blue-200 hover:bg-blue-500/10'
              onClick={onHandoffRun}
              disabled={isMarkingHandoff}
            >
              {isMarkingHandoff ? 'Marking...' : 'Mark handoff-ready'}
            </AiPathsPillButton>
          ) : null}
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
                <JobQueueDetailField label='Path ID' value={detailRun.pathId ?? '-'} />
                <JobQueueDetailField label='Status' value={detailRun.status} />
                <JobQueueDetailField label='Trigger' value={detailRun.triggerEvent ?? '-'} />
                <JobQueueDetailField label='Origin' value={getOriginLabel(runOrigin)} />
                <JobQueueDetailField
                  label='Run type'
                  value={getExecutionLabel(runExecution)}
                />
                <JobQueueDetailField label='Source' value={runSource} />
                <JobQueueDetailField
                  label='Source debug'
                  value={runSourceDebug}
                  className='sm:col-span-2 lg:col-span-3'
                  valueClassName='font-mono text-sky-200'
                />
                <JobQueueDetailField
                  label='Runtime fingerprint'
                  value={runtimeFingerprint ?? 'n/a'}
                  className='sm:col-span-2 lg:col-span-3'
                  valueClassName='font-mono text-sky-200'
                />
                <JobQueueDetailField label='Started' value={formatDate(detailRun.startedAt)} />
                <JobQueueDetailField label='Finished' value={formatDate(detailRun.finishedAt)} />
                <JobQueueDetailField
                  label='Dead-lettered'
                  value={formatDate(detailRun.deadLetteredAt)}
                />
                <JobQueueDetailField
                  label='Retry'
                  value={`${detailRun.retryCount ?? 0}/${detailRun.maxAttempts ?? '-'}`}
                />
                <JobQueueDetailField
                  label='Next retry'
                  value={formatDate(detailRun.nextRetryAt)}
                />
                <JobQueueDetailField
                  label='Trigger node'
                  value={detailRun.triggerNodeId ?? '-'}
                />
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
                            <JobQueueDetailField
                              label='Started'
                              value={formatDate(node.startedAt)}
                            />
                            <JobQueueDetailField
                              label='Finished'
                              value={formatDate(node.finishedAt)}
                            />
                            <JobQueueDetailField label='Attempt' value={node.attempt} />
                          </div>
                          {node.errorMessage ? (
                            <div className='mt-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] text-rose-200'>
                              Error: {node.errorMessage}
                            </div>
                          ) : null}
                          <div className='mt-3 grid gap-3 lg:grid-cols-2'>
                            <JobQueueJsonField
                              label='Inputs'
                              value={node.inputs}
                              ariaLabel='Inputs'
                            />
                            <JobQueueJsonField
                              label='Outputs'
                              value={node.outputs}
                              ariaLabel='Outputs'
                            />
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
                      <RuntimeEventEntry
                        key={event.id}
                        timestamp={formatDate(event.createdAt)}
                        level={event.level}
                        kind={null}
                        message={event.message}
                        className='py-2'
                        timeClassName='text-gray-400'
                        levelClassName='text-gray-300'
                        messageClassName='text-sm text-white'
                        stacked
                        hideKindBadge
                        details={
                          event.metadata ? (
                            <pre className='mt-2 max-h-40 overflow-auto rounded-md border border-border bg-black/30 p-2 text-[11px] text-gray-200'>
                              {safePrettyJson(event.metadata)}
                            </pre>
                          ) : null
                        }
                      />
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
                  <JobQueueJsonField
                    label='Inputs'
                    value={(detailRun.runtimeState as Record<string, unknown>)?.['inputs']}
                    ariaLabel='Inputs'
                  />
                  <JobQueueJsonField
                    label='Outputs'
                    value={(detailRun.runtimeState as Record<string, unknown>)?.['outputs']}
                    ariaLabel='Outputs'
                  />
                </div>
                <div className='mt-3'>
                  <JobQueueJsonField
                    label='Hashes'
                    value={(detailRun.runtimeState as Record<string, unknown>)?.['hashes']}
                    minHeightClassName='min-h-[80px]'
                    ariaLabel='Hashes'
                  />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Graph snapshot</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <JobQueueJsonTextarea
                  value={detailRun.graph}
                  minHeightClassName='min-h-[160px]'
                  ariaLabel='Graph snapshot'
                />
              </CollapsibleSection>

              <CollapsibleSection
                title={<span className='text-[11px] uppercase text-gray-400'>Raw payloads</span>}
                variant='subtle'
                className='border-border/70 bg-black/20'
              >
                <div className='mt-1 space-y-3'>
                  <JobQueueJsonField
                    label='Run'
                    value={detailRun}
                    minHeightClassName='min-h-[140px]'
                    ariaLabel='Run'
                  />
                  <JobQueueJsonField
                    label='Nodes'
                    value={nodes}
                    minHeightClassName='min-h-[140px]'
                    ariaLabel='Nodes'
                  />
                  <JobQueueJsonField
                    label='Events'
                    value={events}
                    ariaLabel='Events'
                  />
                </div>
              </CollapsibleSection>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
