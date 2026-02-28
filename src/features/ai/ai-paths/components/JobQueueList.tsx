'use client';

import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useJobQueueContext } from './JobQueueContext';
import { JobQueueRunCard } from './job-queue-run-card';
import { Pagination, Alert } from '@/shared/ui';

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

  if (runsQueryError) {
    return (
      <Alert variant='error' className='text-xs'>
        {runsQueryError instanceof Error ? runsQueryError.message : 'Failed to load job runs.'}
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
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const run = runs[virtualRow.index];
              if (!run) return null;

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
                  <JobQueueRunCard runId={run.id} run={run} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
