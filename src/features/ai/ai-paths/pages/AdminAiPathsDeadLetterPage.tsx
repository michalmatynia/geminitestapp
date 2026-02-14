'use client';

import { Fragment, useMemo } from 'react';

import type { AiPathRunEventRecord, AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/types/domain/ai-paths';
import { 
  Button, 
  Checkbox, 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  Input, 
  SelectSimple, 
  SectionHeader, 
  DataTable, 
  ConfirmDialog,
  ListPanel,
  FormField,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  PAGE_SIZES,
  calculateNodeStatusSummary,
  formatTimestamp,
} from './dead-letter-utils';
import { useDeadLetterRuns } from '../hooks/useDeadLetterRuns';

import type { ColumnDef } from '@tanstack/react-table';

export function AdminAiPathsDeadLetterPage(): React.JSX.Element {
  const {
    runs,
    total,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    pathId,
    setPathId,
    searchQuery,
    setSearchQuery,
    requeueMode,
    setRequeueMode,
    selectedIds,
    toggleSelected,
    detailOpen,
    setDetailOpen,
    detailLoading,
    detail,
    handleOpenDetail,
    requeueSelected,
    requeueAll,
    requeueingSelected,
    requeueingAll,
    retryFailedPending,
    showRetryFailedConfirm,
    setShowRetryFailedConfirm,
    handleRetryFailedNodes,
    retryNode,
    retryingNodeId,
    expandedNodeIds,
    toggleNodeExpanded,
    streamStatus,
    streamPaused,
    setStreamPaused,
    eventsOverflow,
    eventsBatchLimit,
    loading,
    isFetching,
    refetch,
    handleRequeueSingle,
  } = useDeadLetterRuns();

  const columns = useMemo<ColumnDef<AiPathRunRecord>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelected(row.original.id)}
          aria-label='Select row'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'id',
      header: 'Run',
      cell: ({ row }) => (
        <div className='flex flex-col gap-1'>
          <span className='font-mono text-[11px] text-gray-200'>{row.original.id}</span>
          {row.original.entityId && (
            <span className='text-[10px] text-gray-500 italic'>Entity: {row.original.entityId}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'pathName',
      header: 'Path',
      cell: ({ row }) => (
        <div className='flex flex-col gap-1'>
          <span className='font-medium text-gray-200'>{row.original.pathName || 'Untitled'}</span>
          <span className='text-[10px] text-gray-500 font-mono'>{row.original.pathId}</span>
        </div>
      ),
    },
    {
      accessorKey: 'retryCount',
      header: 'Retries',
      cell: ({ row }) => (
        <span className='text-xs text-gray-300'>
          {row.original.retryCount ?? 0}/{row.original.maxAttempts ?? 0}
        </span>
      ),
    },
    {
      accessorKey: 'deadLetteredAt',
      header: 'Dead Lettered',
      cell: ({ row }) => (
        <span className='text-xs text-gray-400'>
          {row.original.deadLetteredAt
            ? new Date(row.original.deadLetteredAt).toLocaleString()
            : row.original.updatedAt
              ? new Date(row.original.updatedAt).toLocaleString()
              : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'errorMessage',
      header: 'Error',
      cell: ({ row }) => (
        <span className='text-[11px] text-rose-300 line-clamp-2 max-w-[240px]' title={row.original.errorMessage || ''}>
          {row.original.errorMessage || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end gap-2'>
          <Button
            variant='ghost'
            size='xs'
            onClick={() => { void handleOpenDetail(row.original.id); }}
          >
            View
          </Button>
          <Button
            variant='outline'
            size='xs'
            onClick={() => { void handleRequeueSingle(row.original.id); }}
          >
            Requeue
          </Button>
        </div>
      ),
    },
  ], [selectedIds, toggleSelected, handleOpenDetail, handleRequeueSingle]);

  const nodeStatusSummary = useMemo(() => calculateNodeStatusSummary(detail), [detail]);

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Dead Letter Queue'
        description='Runs that exceeded retry limits or failed permanently.'
        actions={
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='xs'
              onClick={refetch}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        }
        className='mb-6'
      />

      <ListPanel
        variant='flat'
        filters={(
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <FormField label='Path ID'>
              <Input
                size='sm'
                value={pathId}
                onChange={(e) => setPathId(e.target.value)}
                placeholder='Filter by path...'
                className='h-8'
              />
            </FormField>
            <FormField label='Search content'>
              <Input
                size='sm'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Run ID, entity, error...'
                className='h-8'
              />
            </FormField>
            <FormField label='Requeue Mode'>
              <SelectSimple
                size='sm'
                value={requeueMode}
                onValueChange={(v) => setRequeueMode(v as 'resume' | 'replay')}
                options={[
                  { value: 'resume', label: 'Resume (Continue)' },
                  { value: 'replay', label: 'Replay (From start)' },
                ]}
                className='h-8'
              />
            </FormField>
            <div className='flex items-end gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 flex-1'
                onClick={requeueSelected}
                disabled={selectedIds.size === 0 || requeueingSelected}
              >
                {requeueingSelected ? 'Queuing...' : `Requeue ${selectedIds.size || 'Selected'}`}
              </Button>
              <Button
                variant='secondary'
                size='sm'
                className='h-8 flex-1'
                onClick={requeueAll}
                disabled={requeueingAll || total === 0}
              >
                {requeueingAll ? 'Queuing...' : 'Requeue All'}
              </Button>
            </div>
          </div>
        )}
      >
        <div className='rounded-md border border-border bg-gray-900/20'>
          <DataTable
            columns={columns}
            data={runs}
            isLoading={loading}
            initialSorting={[{ id: 'deadLetteredAt', desc: true }]}
          />
        </div>

        <div className='mt-4 flex items-center justify-between text-xs text-gray-500'>
          <div>
            Showing {runs.length} of {total} results
          </div>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span>Per page</span>
              <div className='flex gap-1'>
                {PAGE_SIZES.map((size) => (
                  <Button
                    key={size}
                    variant={size === pageSize ? 'secondary' : 'ghost'}
                    size='xs'
                    className='h-6 w-8 p-0'
                    onClick={() => setPageSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='xs'
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className='min-w-[60px] text-center'>Page {page} of {totalPages}</span>
              <Button
                variant='outline'
                size='xs'
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </ListPanel>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className='max-w-4xl border border-border bg-card text-white'>
          <DialogHeader>
            <DialogTitle>Run Details</DialogTitle>
            <DialogDescription className='text-gray-400'>
              Inspect the run state, node statuses, and events.
            </DialogDescription>
          </DialogHeader>
          
          {detailLoading ? (
            <div className='py-12 text-center text-sm text-gray-500'>Loading run details...</div>
          ) : detail ? (
            <div className='space-y-6 max-h-[70vh] overflow-y-auto pr-2'>
              <div className='rounded-md border border-border/70 bg-black/20 p-4'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Run Summary</h3>
                  <div className='flex items-center gap-3'>
                    <span className='text-[10px] font-mono text-gray-500 uppercase'>
                      Stream: {streamStatus}
                    </span>
                    <Button
                      variant='ghost'
                      size='xs'
                      className='h-6 text-[10px]'
                      onClick={() => setStreamPaused(p => !p)}
                    >
                      {streamPaused ? 'Resume stream' : 'Pause stream'}
                    </Button>
                  </div>
                </div>
                
                <div className='grid gap-4 md:grid-cols-3 text-xs'>
                  <div className='space-y-1'>
                    <div className='text-gray-500'>Run ID</div>
                    <div className='font-mono text-gray-200'>{detail.run.id}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-gray-500'>Status</div>
                    <StatusBadge status={detail.run.status} />
                  </div>
                  <div className='space-y-1'>
                    <div className='text-gray-500'>Path</div>
                    <div className='text-gray-200'>{detail.run.pathName || 'Untitled'}</div>
                    <div className='text-[10px] text-gray-500 font-mono'>{detail.run.pathId}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-gray-500'>Entity</div>
                    <div className='text-gray-200'>{detail.run.entityId || '—'}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-gray-500'>Retries</div>
                    <div className='text-gray-200'>{(detail.run.retryCount ?? 0)}/{detail.run.maxAttempts ?? 0}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-gray-500'>Dead-lettered</div>
                    <div className='text-gray-200'>{formatTimestamp(detail.run.deadLetteredAt ?? detail.run.updatedAt)}</div>
                  </div>
                  
                  <div className='md:col-span-3 space-y-1'>
                    <div className='text-gray-500'>Error Message</div>
                    <div className='text-rose-300 bg-rose-500/5 rounded border border-rose-500/20 p-2'>
                      {detail.run.errorMessage || 'No error message provided.'}
                    </div>
                  </div>

                  {nodeStatusSummary && (
                    <div className='md:col-span-3 space-y-2 mt-2'>
                      <div className='flex justify-between text-[10px] text-gray-500 uppercase font-semibold'>
                        <span>Progress: {nodeStatusSummary.completed}/{nodeStatusSummary.totalNodes} Nodes</span>
                        <span>{nodeStatusSummary.progress}%</span>
                      </div>
                      <div className='h-1.5 w-full overflow-hidden rounded-full bg-black/40'>
                        <div
                          className='h-full rounded-full bg-emerald-500/60 transition-all duration-500'
                          style={{ width: `${nodeStatusSummary.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Nodes Execution</h3>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='xs'
                      onClick={() => setShowRetryFailedConfirm(true)}
                      disabled={retryFailedPending || !detail.nodes.some(n => n.status === 'failed' || n.status === 'blocked')}
                    >
                      Retry Failed Nodes
                    </Button>
                  </div>
                </div>
                
                <div className='rounded-md border border-border bg-gray-950/20 overflow-hidden'>
                  <DataTable
                    columns={[
                      {
                        accessorKey: 'nodeId',
                        header: 'Node',
                        cell: ({ row }) => (
                          <div className='flex flex-col'>
                            <span className='font-mono text-[11px] text-gray-200'>{row.original.nodeId}</span>
                            <span className='text-[10px] text-gray-500'>{row.original.nodeTitle || row.original.nodeType}</span>
                          </div>
                        )
                      },
                      {
                        accessorKey: 'status',
                        header: 'Status',
                        cell: ({ row }) => <StatusBadge status={row.original.status} className='text-[9px] px-1.5 py-0' />
                      },
                      {
                        id: 'details',
                        header: 'Details',
                        cell: ({ row }) => {
                          const hasData = Boolean(row.original.inputs) || Boolean(row.original.outputs);
                          const isExpanded = expandedNodeIds.has(row.original.nodeId);
                          return (
                            <Button
                              variant='ghost'
                              size='xs'
                              className='h-6 text-[10px] gap-1'
                              onClick={() => toggleNodeExpanded(row.original.nodeId)}
                              disabled={!hasData}
                            >
                              {isExpanded ? 'Hide Data' : 'Show Data'}
                            </Button>
                          );
                        }
                      },
                      {
                        id: 'actions',
                        header: () => <div className='text-right'>Action</div>,
                        cell: ({ row }) => {
                          const isRetryable = row.original.status === 'failed' || row.original.status === 'blocked';
                          return (
                            <div className='text-right'>
                              <Button
                                variant='outline'
                                size='xs'
                                className='h-6 text-[10px]'
                                onClick={() => retryNode(row.original.nodeId)}
                                disabled={!isRetryable || retryingNodeId === row.original.nodeId}
                              >
                                {retryingNodeId === row.original.nodeId ? 'Retrying...' : 'Retry'}
                              </Button>
                            </div>
                          );
                        }
                      }
                    ]}
                    data={detail.nodes}
                    renderRowDetails={({ row }) => {
                      if (!expandedNodeIds.has(row.original.nodeId)) return null;
                      return (
                        <div className='p-4 bg-black/40 border-t border-white/5'>
                          <div className='grid gap-4 md:grid-cols-2'>
                            <div className='space-y-1'>
                              <span className='text-[10px] uppercase text-gray-600 font-bold'>Inputs</span>
                              <pre className='text-[10px] p-2 bg-black/40 rounded border border-white/5 overflow-auto max-h-40 font-mono'>
                                {JSON.stringify(row.original.inputs || {}, null, 2)}
                              </pre>
                            </div>
                            <div className='space-y-1'>
                              <span className='text-[10px] uppercase text-gray-600 font-bold'>Outputs</span>
                              <pre className='text-[10px] p-2 bg-black/40 rounded border border-white/5 overflow-auto max-h-40 font-mono'>
                                {JSON.stringify(row.original.outputs || {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-xs font-semibold uppercase tracking-wider text-gray-500'>Event Log</h3>
                    {eventsOverflow && (
                      <span className='text-[9px] bg-amber-500/10 text-amber-400 px-1.5 rounded border border-amber-500/20'>
                        Truncated {eventsBatchLimit ? `(Limit ${eventsBatchLimit})` : ''}
                      </span>
                    )}
                  </div>
                  <span className='text-[10px] text-gray-600'>{detail.events.length} Events</span>
                </div>
                
                <div className='rounded-md border border-border bg-black/30 overflow-hidden'>
                  <div className='max-h-60 overflow-y-auto divide-y divide-white/5'>
                    {detail.events.map((event: AiPathRunEventRecord) => (
                      <div key={event.id} className='p-2 hover:bg-white/5 transition-colors'>
                        <div className='flex justify-between text-[10px] mb-1'>
                          <span className='text-gray-500'>{formatTimestamp(event.createdAt)}</span>
                          <span className={cn(
                            'uppercase font-bold',
                            event.level === 'error' ? 'text-rose-400' : 
                              event.level === 'warning' ? 'text-amber-400' : 'text-sky-400'
                          )}>
                            {event.level}
                          </span>
                        </div>
                        <div className='text-xs text-gray-300'>{event.message}</div>
                        {event.metadata && (
                          <pre className='mt-1 text-[9px] text-gray-500 font-mono overflow-x-auto'>
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className='py-12 text-center text-sm text-gray-500'>Could not load run details.</div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showRetryFailedConfirm}
        onOpenChange={setShowRetryFailedConfirm}
        onConfirm={() => { void handleRetryFailedNodes(); }}
        title='Retry failed nodes?'
        description='All failed or blocked nodes in this run will be requeued. This will reset their status to pending and enqueue the run.'
        confirmText='Retry failed nodes'
        variant='success'
        loading={retryFailedPending}
      />
    </div>
  );
}
