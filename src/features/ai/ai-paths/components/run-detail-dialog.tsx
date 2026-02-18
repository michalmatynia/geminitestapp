'use client';

import { useMemo } from 'react';

import type {
  AiPathRunDetail,
  AiPathRunNodeRecord,
  RuntimeHistoryEntry,
  AiPathRunEventRecord,
} from '@/shared/types/domain/ai-paths';
import type { ModalStateProps } from '@/shared/types/modal-props';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  LoadingState,
  AppModal,
} from '@/shared/ui';

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

  const runDetailHistory = runDetail?.run?.runtimeState?.history;

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

  const isScheduledRun = Boolean(runDetail?.run?.triggerEvent === 'scheduled_run');

  return (
    <AppModal
      open={isOpen}
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
              <div>{new Date(runDetail.run.createdAt).toLocaleString()}</div>
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
                <Select
                  {...(selectedHistoryNodeId != null ? { value: selectedHistoryNodeId } : {})}
                  onValueChange={onHistoryNodeSelect}
                >
                  <SelectTrigger className='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'>
                    <SelectValue placeholder='Select node' />
                  </SelectTrigger>
                  <SelectContent className='border-border bg-gray-900 text-white'>
                    {historyOptions.map(
                      (option: { id: string; label: string }): React.JSX.Element => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
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
          <details className='rounded-md border border-border/70 bg-black/20 p-3'>
            <summary className='cursor-pointer text-[11px] uppercase text-gray-400'>
                Raw payloads
            </summary>
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
          </details>
        </div>
      ) : (
        <div className='text-sm text-gray-400'>No run selected.</div>
      )}
    </AppModal>
  );
}

export const RunDetailDialogWithContext = RunDetailDialog;
