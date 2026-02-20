'use client';

import { useMemo } from 'react';

import type {
  AiPathRunDetail,
  AiPathRunNodeRecord,
  RuntimeHistoryEntry,
  AiPathRunEventRecord,
} from '@/shared/contracts/ai-paths';
import type { ModalStateProps } from '@/shared/contracts/ui';
import {
  Button,
  Label,
  SelectSimple,
  Textarea,
  LoadingState,
  CollapsibleSection,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { buildHistoryNodeOptions } from './run-history-utils';
import { RunTimeline } from './run-timeline';
import { RunHistoryEntries } from './RunHistoryEntries';

interface RunDetailDialogProps extends ModalStateProps {
  loading: boolean;
  runDetail: AiPathRunDetail | null;
  runStreamStatus: string;
  runStreamPaused: boolean;
  runEventsOverflow: boolean;
  runEventsBatchLimit: number | null;
  runHistoryNodeId: string | null;
  onStreamPauseToggle: (paused: boolean) => void;
  onHistoryNodeSelect: (nodeId: string) => void;
}

type RuntimeTraceSnapshot = {
  traceId?: string;
  profile?: {
    eventCount?: number;
    sampledEventCount?: number;
    droppedEventCount?: number;
    nodeSpans?: Array<{
      spanId?: string;
      nodeId?: string;
      nodeType?: string;
      nodeTitle?: string | null;
      status?: string;
      iteration?: number;
      attempt?: number;
      startedAt?: string | null;
      finishedAt?: string | null;
      durationMs?: number | null;
      error?: string | null;
      cached?: boolean;
    }>;
    summary?: {
      durationMs?: number;
      iterationCount?: number;
      nodeCount?: number;
      edgeCount?: number;
      hottestNodes?: Array<{
        nodeId?: string;
        nodeType?: string;
        avgMs?: number;
        totalMs?: number;
      }>;
    } | null;
  } | null;
};

export function RunDetailDialog({
  isOpen,
  onClose,
  loading: runDetailLoading,
  runDetail,
  runStreamStatus,
  runStreamPaused,
  runEventsOverflow,
  runEventsBatchLimit,
  runHistoryNodeId,
  onStreamPauseToggle,
  onHistoryNodeSelect,
}: RunDetailDialogProps): React.JSX.Element {
  const runNodeSummary = useMemo(() => {
    if (!runDetail) return null;
    const counts: Record<string, number> = {};
    runDetail.nodes.forEach((node: AiPathRunNodeRecord) => {
      const status = node.status ?? 'unknown';
      counts[status] = (counts[status] ?? 0) + 1;
    });
    const total = runDetail.nodes.length;
    const completed = counts['completed'] ?? 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { counts, total, completed, progress };
  }, [runDetail]);

  const runDetailHistory = (
    runDetail?.run?.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | undefined
  )?.history;

  const historyOptions = useMemo(
    () =>
      buildHistoryNodeOptions(
        runDetailHistory,
        runDetail?.nodes ?? null,
        runDetail?.run?.graph?.nodes ?? null
      ),
    [runDetailHistory, runDetail?.nodes, runDetail?.run?.graph?.nodes]
  );

  const selectedHistoryNodeId = runHistoryNodeId ?? historyOptions[0]?.id ?? null;

  const historyEntries: RuntimeHistoryEntry[] = useMemo(() => {
    if (!selectedHistoryNodeId || !runDetailHistory) return [];
    return runDetailHistory[selectedHistoryNodeId] ?? [];
  }, [selectedHistoryNodeId, runDetailHistory]);

  const runtimeTrace = useMemo((): RuntimeTraceSnapshot | null => {
    if (!runDetail?.run?.meta || typeof runDetail.run.meta !== 'object') return null;
    const runtimeTraceRaw = runDetail.run.meta['runtimeTrace'];
    if (!runtimeTraceRaw || typeof runtimeTraceRaw !== 'object') return null;
    return runtimeTraceRaw as RuntimeTraceSnapshot;
  }, [runDetail]);

  const slowestRuntimeNodeSpan = useMemo(() => {
    const spans = runtimeTrace?.profile?.nodeSpans;
    if (!Array.isArray(spans) || spans.length === 0) return null;
    return spans.reduce<
      | {
        spanId?: string;
        nodeId?: string;
        nodeType?: string;
        durationMs?: number | null;
      }
      | null
    >((slowest, current) => {
      const currentDuration =
        typeof current.durationMs === 'number' && Number.isFinite(current.durationMs)
          ? current.durationMs
          : null;
      if (currentDuration === null) return slowest;
      const slowestDuration =
        slowest && typeof slowest.durationMs === 'number' ? slowest.durationMs : null;
      if (slowestDuration === null || currentDuration > slowestDuration) {
        return current;
      }
      return slowest;
    }, null);
  }, [runtimeTrace]);

  const isScheduledRun = Boolean(runDetail?.run?.triggerEvent === 'scheduled_run');

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
                  <span className='rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-[1px] text-[9px] uppercase text-amber-200'>
                      Scheduled
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Stream</span>
              <div className='flex flex-wrap items-center gap-2 text-sm'>
                <span>{runStreamStatus}</span>
                <Button variant='ghost' size='sm' onClick={() => onStreamPauseToggle(!runStreamPaused)}>
                  {runStreamPaused ? 'Resume stream' : 'Pause stream'}
                </Button>
              </div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Run ID</span>
              <div className='font-mono text-[11px]'>{runDetail.run.id}</div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Created</span>
              <div>{runDetail.run.createdAt ? new Date(runDetail.run.createdAt).toLocaleString() : '-'}</div>
            </div>
            <div>
              <span className='text-[10px] uppercase text-gray-500'>Started</span>
              <div>
                {runDetail.run.startedAt
                  ? new Date(runDetail.run.startedAt).toLocaleString()
                  : '-'}
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
          {runtimeTrace ? (
            <div className='rounded-md border border-sky-500/30 bg-sky-500/5 p-3'>
              <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-sky-100'>
                <span className='font-semibold'>Runtime Trace</span>
                <span className='font-mono text-[10px] text-sky-200'>
                  {runtimeTrace.traceId ?? 'n/a'}
                </span>
              </div>
              <div className='mt-2 grid gap-2 text-[11px] text-sky-100 sm:grid-cols-2'>
                <div>
                  Profiled events: {runtimeTrace.profile?.sampledEventCount ?? 0}
                  {typeof runtimeTrace.profile?.droppedEventCount === 'number' &&
                  runtimeTrace.profile.droppedEventCount > 0
                    ? ` (+${runtimeTrace.profile.droppedEventCount} truncated)`
                    : ''}
                </div>
                <div>
                  Engine events: {runtimeTrace.profile?.eventCount ?? 0}
                </div>
                <div>
                  Runtime: {runtimeTrace.profile?.summary?.durationMs ?? 0}ms
                </div>
                <div>
                  Iterations: {runtimeTrace.profile?.summary?.iterationCount ?? 0}
                </div>
                <div>
                  Node spans: {runtimeTrace.profile?.nodeSpans?.length ?? 0}
                </div>
              </div>
              {runtimeTrace.profile?.summary?.hottestNodes?.[0] ? (
                <div className='mt-2 text-[11px] text-sky-100'>
                  Hottest node: {runtimeTrace.profile.summary.hottestNodes[0]?.nodeId ?? 'n/a'} (
                  {runtimeTrace.profile.summary.hottestNodes[0]?.nodeType ?? 'unknown'}) ·
                  avg {Math.round(runtimeTrace.profile.summary.hottestNodes[0]?.avgMs ?? 0)}ms
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
          <RunTimeline
            run={runDetail.run}
            nodes={runDetail.nodes}
            events={runDetail.events as unknown as AiPathRunEventRecord[]}
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
                  options={historyOptions.map(opt => ({ value: opt.id, label: opt.label }))}
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
              <div>
                <Label className='text-[10px] uppercase text-gray-500'>Run</Label>
                <Textarea
                  className='mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                  readOnly
                  value={JSON.stringify(runDetail.run, null, 2)}
                />
              </div>
              <div>
                <Label className='text-[10px] uppercase text-gray-500'>Nodes</Label>
                <Textarea
                  className='mt-2 min-h-[140px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                  readOnly
                  value={JSON.stringify(runDetail.nodes, null, 2)}
                />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <Label className='text-[10px] uppercase text-gray-500'>Events</Label>
                  {runEventsOverflow ? (
                    <span className='rounded border border-amber-400/50 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200'>
                        Truncated
                      {runEventsBatchLimit ? ` (limit ${runEventsBatchLimit})` : ''}
                    </span>
                  ) : null}
                </div>
                <Textarea
                  className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-[11px] text-gray-200'
                  readOnly
                  value={JSON.stringify(runDetail.events, null, 2)}
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
