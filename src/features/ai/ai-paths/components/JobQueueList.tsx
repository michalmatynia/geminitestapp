'use client';

import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useJobQueueContext } from './JobQueueContext';
import { JobQueueRunCard } from './job-queue-run-card';
import { 
  Pagination, 
  Alert 
} from '@/shared/ui';
import { 
  normalizeRunDetail, 
  isRunningStatus, 
  resolveRunOrigin, 
  resolveRunExecutionKind, 
  resolveRunSource, 
  resolveRunSourceDebug, 
  normalizeRunNodes, 
  normalizeRunEvents,
  type StreamConnectionStatus 
} from './job-queue-panel-utils';
import { buildHistoryNodeOptions } from './run-history-utils';
import type { 
  RuntimeHistoryEntry 
} from '@/features/ai/ai-paths/lib';

const PAGE_SIZES = [10, 25, 50];

export function JobQueueList(): React.JSX.Element {
  const {
    runs,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    runsQueryError,
    expandedRunIds,
    runDetails,
    runDetailLoading,
    runDetailErrors,
    pausedStreams,
    streamStatuses,
    isCancelingRun,
    isDeletingRun,
    toggleRun,
    toggleStream,
    loadRunDetail,
    handleCancelRun,
    setRunToDelete,
    setHistorySelection,
    historySelection,
  } = useJobQueueContext();

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: runs.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => runs[index]?.id ?? index,
    estimateSize: () => 140,
    overscan: 5,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, runs, expandedRunIds, runDetails]);

  const ensureHistorySelection = (runId: string, options: { id: string }[]): string | null => {
    if (!options.length) return null;
    const existing = historySelection[runId];
    if (existing && options.some((option: { id: string }) => option.id === existing)) return existing;
    return options[0]?.id ?? null;
  };

  const typedRunsQueryError = runsQueryError as any;

  if (typedRunsQueryError) {
    return (
      <Alert variant='error' className='text-xs'>
        {typedRunsQueryError instanceof Error ? typedRunsQueryError.message : 'Failed to load job runs.'}
      </Alert>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='text-[11px] text-gray-400'>
          Showing {runs.length} of {total} runs
        </div>
        <Pagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / pageSize))}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={PAGE_SIZES}
          showPageSize
          variant='compact'
        />
      </div>

      {runs.length === 0 ? (
        <div className='rounded-md border border-border bg-card/40 p-4 text-sm text-gray-400'>
          No runs found for the current filters.
        </div>
      ) : (
        <div ref={parentRef} className='space-y-3 overflow-auto' style={{ maxHeight: '75vh' }}>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const run = runs[virtualRow.index];
              if (!run) return null;

              const isExpanded = expandedRunIds.has(run.id);
              const detail = normalizeRunDetail(runDetails[run.id]);
              const detailLoading = runDetailLoading.has(run.id);
              const detailError = runDetailErrors[run.id];
              const detailRun = detail?.run ?? run;
              const isRunning = isRunningStatus(detailRun.status);
              const isScheduledRun = detailRun.triggerEvent === 'scheduled_run';
              const streamStatus: StreamConnectionStatus = pausedStreams.has(run.id)
                ? 'paused'
                : streamStatuses[run.id] ?? 'stopped';
              const canCancel = ['queued', 'running', 'paused'].includes(detailRun.status);
              
              const nodes = normalizeRunNodes(detail?.nodes);
              const events = normalizeRunEvents(detail?.events);
              const history = (detailRun.runtimeState as { history?: Record<string, RuntimeHistoryEntry[]> } | undefined)?.history;
              const historyOptions = buildHistoryNodeOptions(history, nodes, detailRun.graph?.nodes ?? null);
              const selectedHistoryNodeId = ensureHistorySelection(run.id, historyOptions);
              const historyEntries = selectedHistoryNodeId && history ? history[selectedHistoryNodeId] ?? [] : [];

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '12px',
                  }}
                >
                  <JobQueueRunCard
                    detailRun={detailRun}
                    detail={detail}
                    detailLoading={detailLoading}
                    detailError={detailError}
                    isExpanded={isExpanded}
                    isRunning={isRunning}
                    isScheduledRun={isScheduledRun}
                    streamStatus={streamStatus}
                    paused={pausedStreams.has(run.id)}
                    canCancel={canCancel}
                    isCancellingThisRun={isCancelingRun(run.id)}
                    isDeletingThisRun={isDeletingRun(run.id)}
                    runOrigin={resolveRunOrigin(detailRun)}
                    runExecution={resolveRunExecutionKind(detailRun)}
                    runSource={resolveRunSource(detailRun) ?? 'unknown'}
                    runSourceDebug={resolveRunSourceDebug(detailRun)}
                    nodes={nodes}
                    events={events}
                    historyOptions={historyOptions}
                    selectedHistoryNodeId={selectedHistoryNodeId}
                    historyEntries={historyEntries}
                    onToggleRun={() => toggleRun(run.id)}
                    onToggleStream={() => toggleStream(run.id)}
                    onRefreshDetail={() => void loadRunDetail(run.id)}
                    onCancelRun={() => void handleCancelRun(run.id)}
                    onDeleteRun={() => setRunToDelete(detailRun)}
                    onSelectHistoryNode={(val) => setHistorySelection(run.id, val)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
