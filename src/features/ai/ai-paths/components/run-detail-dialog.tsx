'use client';

import { useMemo } from 'react';

import type { AiPathRunNodeRecord, RuntimeHistoryEntry } from '@/shared/contracts/ai-paths';
import type { AiPathRunErrorSummary } from '@/shared/lib/ai-paths/error-reporting';
import {
  Button,
  Label,
  SelectSimple,
  LoadingState,
  CollapsibleSection,
  JsonViewer,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { normalizeRunEvents, normalizeRunNodes } from './job-queue-panel-utils';
import { collectPlaywrightArtifacts } from './playwright-artifacts';
import { buildHistoryNodeOptions } from './run-history-utils';
import { readRuntimeTraceSummary } from './run-trace-utils';
import { RunTimeline } from './run-timeline';
import { RunHistoryEntries } from './RunHistoryEntries';
import { useRunHistoryActions, useRunHistoryState } from '../context';

export function RunDetailDialog(): React.JSX.Element {
  const {
    runDetailOpen: isOpen,
    runDetailLoading,
    runDetail,
    runStreamStatus,
    runStreamPaused,
    runEventsOverflow,
    runEventsBatchLimit,
    runHistoryNodeId: runHistoryNodeId,
  } = useRunHistoryState();
  const {
    setRunDetailOpen,
    setRunStreamPaused: onStreamPauseToggle,
    setRunHistoryNodeId: onHistoryNodeSelect,
    resumeRun,
  } = useRunHistoryActions();

  const onClose = () => setRunDetailOpen(false);

  const runNodes = useMemo(() => normalizeRunNodes(runDetail?.nodes), [runDetail?.nodes]);
  const runEvents = useMemo(() => normalizeRunEvents(runDetail?.events), [runDetail?.events]);

  const runNodeSummary = useMemo(() => {
    if (!runDetail) return null;
    const counts: Record<string, number> = {};
    runNodes.forEach((node: AiPathRunNodeRecord) => {
      const status = node.status ?? 'unknown';
      counts[status] = (counts[status] ?? 0) + 1;
    });
    const total = runNodes.length;
    const completed = counts['completed'] ?? 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { counts, total, completed, progress };
  }, [runDetail, runNodes]);

  const runDetailHistory = (
    runDetail?.run?.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | undefined
  )?.history;

  const historyOptions = useMemo(
    () => buildHistoryNodeOptions(runDetailHistory, runNodes, runDetail?.run?.graph?.nodes ?? null),
    [runDetailHistory, runDetail?.run?.graph?.nodes, runNodes]
  );

  const selectedHistoryNodeId = runHistoryNodeId ?? historyOptions[0]?.id ?? null;

  const historyEntries: RuntimeHistoryEntry[] = useMemo(() => {
    if (!selectedHistoryNodeId || !runDetailHistory) return [];
    return runDetailHistory[selectedHistoryNodeId] ?? [];
  }, [selectedHistoryNodeId, runDetailHistory]);

  const runtimeTraceSummary = useMemo(
    () => readRuntimeTraceSummary(runDetail?.run?.meta ?? null),
    [runDetail?.run?.meta]
  );
  const runtimeTrace = runtimeTraceSummary?.snapshot ?? null;

  const runtimeFingerprint = useMemo((): string | null => {
    if (!runDetail?.run?.meta || typeof runDetail.run.meta !== 'object') return null;
    const raw = runDetail.run.meta['runtimeFingerprint'];
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [runDetail]);

  const errorSummary = useMemo((): AiPathRunErrorSummary | null => {
    if (!runDetail || !('errorSummary' in runDetail)) return null;
    return runDetail.errorSummary ?? null;
  }, [runDetail]);

  const slowestRuntimeNodeSpan = runtimeTraceSummary?.slowestSpan ?? null;

  const playwrightArtifacts = useMemo(() => collectPlaywrightArtifacts(runNodes), [runNodes]);

  const isScheduledRun = Boolean(runDetail?.run?.triggerEvent === 'scheduled_run');

  const switchRoutingSummary = useMemo(() => {
    if (!runDetailHistory || !runDetail?.run?.graph?.nodes) return [];
    const graphNodes = runDetail.run.graph.nodes;
    return graphNodes
      .filter((node) => node.type === 'switch')
      .map((node) => {
        const entriesForNode = runDetailHistory[node.id] ?? [];
        const caseCounts: Record<string, number> = {};
        let defaultCount = 0;
        let errorCount = 0;
        entriesForNode.forEach((entry: RuntimeHistoryEntry) => {
          const outputs = entry.outputs ?? {};
          const caseIdRaw = outputs['caseId'];
          const errorCodeRaw = outputs['errorCode'];
          if (typeof errorCodeRaw === 'string' && errorCodeRaw.length > 0) {
            errorCount += 1;
          }
          if (typeof caseIdRaw === 'string' && caseIdRaw.length > 0) {
            caseCounts[caseIdRaw] = (caseCounts[caseIdRaw] ?? 0) + 1;
          } else {
            defaultCount += 1;
          }
        });
        const total = entriesForNode.length;
        return {
          nodeId: node.id,
          nodeTitle: node.title ?? node.id,
          total,
          caseCounts,
          defaultCount,
          errorCount,
        };
      })
      .filter((summary) => summary.total > 0);
  }, [runDetailHistory, runDetail?.run?.graph?.nodes]);

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Run Details'
      subtitle='Persistent AI Path runtime snapshot.'
      size='lg'
    >
      {runDetailLoading ? (
        <LoadingState message='Loading run details...' size='sm' className='p-4' />
      ) : runDetail ? (
        <div className='space-y-4 text-xs text-gray-300'>
          <div className='grid gap-2 sm:grid-cols-2'>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Status</span>
              <div className='flex flex-wrap items-center gap-2 text-sm'>
                <span>{runDetail.run.status}</span>
                {isScheduledRun ? (
                  <span className='rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-px text-[9px] uppercase text-amber-200'>
                    Scheduled
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Stream</span>
              <div className='flex flex-wrap items-center gap-2 text-sm'>
                <span>{runStreamStatus}</span>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onStreamPauseToggle(!runStreamPaused)}
                >
                  {runStreamPaused ? 'Resume stream' : 'Pause stream'}
                </Button>
              </div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Run ID</span>
              <div className='font-mono text-[11px]'>{runDetail.run.id}</div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Runtime Fingerprint</span>
              <div className='font-mono text-[11px]'>{runtimeFingerprint ?? 'n/a'}</div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Created</span>
              <div>
                {runDetail.run.createdAt ? new Date(runDetail.run.createdAt).toLocaleString() : '-'}
              </div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Started</span>
              <div>
                {runDetail.run.startedAt ? new Date(runDetail.run.startedAt).toLocaleString() : '-'}
              </div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Finished</span>
              <div>
                {runDetail.run.finishedAt
                  ? new Date(runDetail.run.finishedAt).toLocaleString()
                  : '-'}
              </div>
            </div>
          </div>
          {runNodeSummary ? (
            <div className='rounded-md border border-border/70 bg-black/20 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500'>
                <span>
                  Nodes: {runNodeSummary.completed}/{runNodeSummary.total} completed
                </span>
                <span>{runNodeSummary.progress}%</span>
              </div>
              <div className='mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40'>
                <div
                  className='h-full rounded-full bg-emerald-400/70 transition-all'
                  style={{ width: `${runNodeSummary.progress}%` }}
                />
              </div>
              <div className='mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500'>
                {Object.entries(runNodeSummary.counts).map(
                  ([status, count]: [string, number]): React.JSX.Element => (
                    <span key={status}>
                      {status}: {count}
                    </span>
                  )
                )}
              </div>
            </div>
          ) : null}
          {errorSummary ? (
            <div className='rounded-md border border-rose-500/40 bg-rose-500/10 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-100'>
                <span className='font-semibold'>Error Summary</span>
                <span className='font-mono text-[10px] text-rose-200'>
                  reports={errorSummary.reportCount} errors={errorSummary.totalErrors}
                </span>
              </div>
              {errorSummary.primary ? (
                <div className='mt-2 rounded-md border border-rose-500/40 bg-black/20 p-2 text-[11px] text-rose-100'>
                  <div className='font-mono text-[10px] text-rose-200'>
                    {errorSummary.primary.code}
                  </div>
                  <div className='mt-1'>{errorSummary.primary.userMessage}</div>
                  <div className='mt-1 text-[10px] text-rose-200/80'>
                    scope={errorSummary.primary.scope}
                    {errorSummary.primary.nodeId ? ` node=${errorSummary.primary.nodeId}` : ''}
                    {errorSummary.primary.retryable ? ' retryable=true' : ''}
                  </div>
                </div>
              ) : null}
              {errorSummary.codes.length > 0 ? (
                <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-rose-200'>
                  {errorSummary.codes.map((entry) => (
                    <span
                      key={entry.code}
                      className='rounded-full border border-rose-400/60 bg-rose-500/20 px-2 py-px font-mono'
                    >
                      {entry.code}: {entry.count}
                    </span>
                  ))}
                </div>
              ) : null}
              {errorSummary.nodeFailures.length > 0 ? (
                <div className='mt-2 space-y-1 text-[10px] text-rose-100/90'>
                  {errorSummary.nodeFailures.map((node) => (
                    <div
                      key={node.nodeId}
                      className='rounded border border-rose-500/30 bg-black/20 px-2 py-1'
                    >
                      <span className='font-mono'>{node.nodeId}</span>
                      {node.nodeTitle ? ` (${node.nodeTitle})` : ''} - {node.code ?? 'unknown'} x
                      {node.count}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {runtimeTrace ? (
            <div className='rounded-md border border-sky-500/30 bg-sky-500/5 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-sky-100'>
                <span className='font-semibold'>Runtime Trace</span>
                <span className='font-mono text-[10px] text-sky-200'>
                  {runtimeTraceSummary?.traceId ?? 'n/a'}
                </span>
              </div>
              <div className='mt-2 grid gap-2 text-[11px] text-sky-100 sm:grid-cols-2'>
                <div>
                  Profiled events: {runtimeTraceSummary?.profiledEventCount ?? 0}
                  {runtimeTraceSummary && runtimeTraceSummary.droppedEventCount > 0
                    ? ` (+${runtimeTraceSummary.droppedEventCount} truncated)`
                    : ''}
                </div>
                <div>Engine events: {runtimeTraceSummary?.engineEventCount ?? 0}</div>
                <div>Runtime: {runtimeTraceSummary?.durationMs ?? 0}ms</div>
                <div>Iterations: {runtimeTraceSummary?.iterationCount ?? 0}</div>
                <div>Node spans: {runtimeTraceSummary?.nodeSpanCount ?? 0}</div>
                <div>Source: {runtimeTraceSummary?.source ?? 'unknown'}</div>
                <div>
                  Trace finished:{' '}
                  {runtimeTraceSummary?.finishedAt
                    ? new Date(runtimeTraceSummary.finishedAt).toLocaleString()
                    : 'in progress'}
                </div>
              </div>
              {runtimeTraceSummary?.hottestNode ? (
                <div className='mt-2 text-[11px] text-sky-100'>
                  Hottest node: {runtimeTraceSummary.hottestNode.nodeId ?? 'n/a'} (
                  {runtimeTraceSummary.hottestNode.nodeType ?? 'unknown'}) · avg{' '}
                  {Math.round(runtimeTraceSummary.hottestNode.avgMs ?? 0)}ms
                </div>
              ) : null}
              {slowestRuntimeNodeSpan ? (
                <div className='mt-1 text-[11px] text-sky-100/90'>
                  Slowest span: {slowestRuntimeNodeSpan.nodeId ?? 'n/a'} (
                  {slowestRuntimeNodeSpan.nodeType ?? 'unknown'}) ·
                  {Math.round(slowestRuntimeNodeSpan.durationMs ?? 0)}ms
                </div>
              ) : null}
            </div>
          ) : null}
          {switchRoutingSummary.length > 0 ? (
            <div className='rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3'>
              <div className='mb-2 text-[11px] font-semibold text-emerald-100'>
                Switch routing (this run)
              </div>
              <div className='space-y-2 text-[11px] text-emerald-50'>
                {switchRoutingSummary.map((summary) => {
                  const hasNeverHitCases =
                    Array.isArray(runDetail.run.graph?.nodes) &&
                    runDetail.run.graph.nodes.some(
                      (n) =>
                        n.id === summary.nodeId &&
                        Array.isArray(n.config?.switch?.cases) &&
                        (n.config?.switch?.cases ?? []).some(
                          (c) => !summary.caseCounts[c.id] && summary.defaultCount === 0
                        )
                    );
                  return (
                    <div
                      key={summary.nodeId}
                      className='rounded-md border border-emerald-500/40 bg-black/20 p-2'
                    >
                      <div className='flex flex-wrap items-center justify-between gap-2'>
                        <span className='font-semibold'>
                          {summary.nodeTitle}{' '}
                          <span className='font-mono text-xs'>({summary.nodeId})</span>
                        </span>
                        <span className='text-[10px] text-emerald-200'>
                          Samples: {summary.total}
                          {summary.errorCount > 0 ? (
                            <span className='ml-2 rounded-full border border-rose-400/60 bg-rose-500/20 px-2 py-px text-[10px] text-rose-100'>
                              Errors: {summary.errorCount}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className='mt-1 flex flex-wrap gap-2 text-[10px] text-emerald-200'>
                        {Object.entries(summary.caseCounts).map(([caseId, count]) => (
                          <span
                            key={caseId}
                            className='rounded-full border border-emerald-400/60 bg-emerald-500/15 px-2 py-px font-mono'
                          >
                            caseId={caseId}: {count}
                          </span>
                        ))}
                        {summary.defaultCount > 0 && (
                          <span className='rounded-full border border-sky-400/60 bg-sky-500/15 px-2 py-px font-mono text-sky-100'>
                            default: {summary.defaultCount}
                          </span>
                        )}
                      </div>
                      {hasNeverHitCases ? (
                        <div className='mt-1 text-[10px] text-amber-200'>
                          Some configured cases were never hit in this run.
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {playwrightArtifacts.length > 0 ? (
            <div className='rounded-md border border-sky-500/30 bg-sky-500/5 p-3'>
              <div className='text-[11px] font-semibold text-sky-100'>
                Playwright Artifacts ({playwrightArtifacts.length})
              </div>
              <div className='mt-2 space-y-1'>
                {playwrightArtifacts.map((artifact, index) => (
                  <div
                    key={`${artifact.path}:${artifact.nodeId}:${index}`}
                    className='flex flex-wrap items-center gap-2 text-[11px]'
                  >
                    <span className='text-gray-400'>{artifact.nodeTitle ?? artifact.nodeId}</span>
                    {artifact.url ? (
                      <a
                        href={artifact.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sky-200 underline decoration-sky-300/60 underline-offset-2 hover:text-sky-100'
                        title={artifact.path}
                      >
                        {artifact.name}
                      </a>
                    ) : (
                      <span className='text-gray-200'>{artifact.name}</span>
                    )}
                    {artifact.kind ? (
                      <span className='text-gray-500'>({artifact.kind})</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <RunTimeline
            run={runDetail.run}
            nodes={runNodes}
            events={runEvents}
            eventsOverflow={runEventsOverflow}
            eventsBatchLimit={runEventsBatchLimit}
          />
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <Label className='text-[10px] uppercase text-gray-500'>History</Label>
              {historyOptions.length > 1 ? (
                <SelectSimple
                  size='sm'
                  value={selectedHistoryNodeId ?? ''}
                  onValueChange={onHistoryNodeSelect}
                  options={historyOptions.map((opt) => ({ value: opt.id, label: opt.label }))}
                  placeholder='Select node'
                  triggerClassName='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'
                />
              ) : (
                <div className='text-[11px] text-gray-400'>
                  {historyOptions[0]?.label ?? 'No nodes'}
                </div>
              )}
            </div>
            {historyOptions.length > 0 ? (
              <div className='mt-3'>
                <RunHistoryEntries
                  entries={historyEntries}
                  emptyMessage='No history for this node.'
                  onReplayFromEntry={(): void => {
                    if (!runDetail?.run?.id) return;
                    // For now we replay the whole run that produced this history entry.
                    void resumeRun(runDetail.run.id, 'replay').catch(() => {});
                  }}
                />
              </div>
            ) : (
              <div className='mt-2 text-[11px] text-gray-500'>
                No history recorded for this run.
              </div>
            )}
          </div>
          <CollapsibleSection
            title='Raw payloads'
            variant='card'
            triggerClassName='text-[11px] uppercase text-gray-400'
            className='bg-black/20'
          >
            <div className='mt-3 space-y-3'>
              <JsonViewer
                title='Run'
                data={runDetail.run}
                maxHeight='200px'
                className='bg-card/70'
              />
              <JsonViewer
                title='Nodes'
                data={runDetail.nodes}
                maxHeight='200px'
                className='bg-card/70'
              />
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  {runEventsOverflow ? (
                    <span className='rounded border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200'>
                      Truncated
                      {runEventsBatchLimit ? ` (limit ${runEventsBatchLimit})` : ''}
                    </span>
                  ) : null}
                </div>
                <JsonViewer
                  title='Events'
                  data={runDetail.events}
                  maxHeight='200px'
                  className='bg-card/70'
                />
              </div>
            </div>
          </CollapsibleSection>
        </div>
      ) : (
        <div className='text-sm text-gray-400'>No run selected.</div>
      )}
    </DetailModal>
  );
}

export const RunDetailDialogWithContext = RunDetailDialog;
