'use client';

import { RefreshCw, AlertCircle, Eye, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

import type { AiPathRunEventRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import {
  AdminWidePageLayout,
  Button,
  Checkbox,
  DataTable,
  StandardDataTablePanel,
  ConfirmModal,
  FormSection,
  StatusBadge,
  Alert,
  PanelPagination,
  EmptyState,
  MetadataItem,
  Badge,
  FilterPanel,
  Hint,
  Card,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

import { PAGE_SIZES, calculateNodeStatusSummary, formatTimestamp } from './dead-letter-utils';
import { useDeadLetterRuns } from '../hooks/useDeadLetterRuns';

import type { ColumnDef } from '@tanstack/react-table';

export function AdminAiPathsDeadLetterPage(): React.JSX.Element {
  const {
    runs,
    total,
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
    loading,
    isFetching,
    refetch,
    handleRequeueSingle,
  } = useDeadLetterRuns();

  const columns = useMemo<ColumnDef<AiPathRunRecord>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
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
              <span className='text-[10px] text-gray-500 italic'>
                Entity: {row.original.entityId}
              </span>
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
          <span
            className='text-[11px] text-rose-300 line-clamp-2 max-w-[240px]'
            title={row.original.errorMessage || ''}
          >
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
              onClick={() => {
                void handleOpenDetail(row.original.id);
              }}
              className='h-7'
            >
              <Eye className='size-3 mr-1.5' />
              View
            </Button>
            <Button
              variant='outline'
              size='xs'
              onClick={() => {
                void handleRequeueSingle(row.original.id);
              }}
              className='h-7'
            >
              <RotateCcw className='size-3 mr-1.5' />
              Requeue
            </Button>
          </div>
        ),
      },
    ],
    [selectedIds, toggleSelected, handleOpenDetail, handleRequeueSingle]
  );

  const nodeStatusSummary = useMemo(() => calculateNodeStatusSummary(detail), [detail]);

  return (
    <AdminWidePageLayout
        title='Dead Letter Queue'
        description='Runs that exceeded retry limits or failed permanently.'
        icon={<AlertCircle className='size-4' />}
        refresh={{
          onRefresh: refetch,
          isRefreshing: isFetching,
        }}
      >
      <StandardDataTablePanel
        filters={
          <FilterPanel
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder='Run ID, entity, error...'
            values={{
              pathId,
              requeueMode,
            }}
            onFilterChange={(key, value) => {
              if (key === 'pathId') setPathId(value as string);
              if (key === 'requeueMode') setRequeueMode(value as 'resume' | 'replay');
            }}
            filters={[
              {
                key: 'pathId',
                label: 'Path ID',
                type: 'text',
                placeholder: 'Filter by path...',
              },
              {
                key: 'requeueMode',
                label: 'Requeue Mode',
                type: 'select',
                options: [
                  { value: 'resume', label: 'Resume (Continue)' },
                  { value: 'replay', label: 'Replay (From start)' },
                ],
              },
            ]}
            headerAction={
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={requeueSelected}
                  disabled={selectedIds.size === 0 || requeueingSelected}
                >
                  {requeueingSelected ? 'Queuing...' : `Requeue ${selectedIds.size || 'Selected'}`}
                </Button>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={requeueAll}
                  disabled={requeueingAll || total === 0}
                >
                  {requeueingAll ? 'Queuing...' : 'Requeue All'}
                </Button>
              </div>
            }
          />
        }
        footer={
          <PanelPagination
            page={page}
            pageSize={pageSize}
            totalCount={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={PAGE_SIZES}
          />
        }
        columns={columns}
        data={runs}
        isLoading={loading}
        emptyState={
          <EmptyState
            title='Queue empty'
            description={
              pathId || searchQuery
                ? 'No dead-letter runs match your search.'
                : 'All runs are processing correctly (or none have failed yet).'
            }
          />
        }
      />

      <DetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title='Run Details'
        subtitle='Inspect the run state, node statuses, and events.'
        size='xl'
      >
        {detailLoading ? (
          <div className='py-12 text-center text-sm text-gray-500'>
            <RefreshCw className='size-6 animate-spin mx-auto mb-2' />
            Loading run details...
          </div>
        ) : detail ? (
          <div className='space-y-6'>
            <FormSection
              title='Run Summary'
              variant='subtle'
              actions={
                <div className='flex items-center gap-3'>
                  <StatusBadge
                    status={streamStatus}
                    variant='neutral'
                    size='sm'
                    className='font-mono uppercase'
                  />
                  <Button
                    variant='ghost'
                    size='xs'
                    className='h-6 text-[10px]'
                    onClick={() => setStreamPaused((p) => !p)}
                  >
                    {streamPaused ? 'Resume stream' : 'Pause stream'}
                  </Button>
                </div>
              }
            >
              <div className='grid gap-4 md:grid-cols-3'>
                <MetadataItem label='Run ID' value={detail.run.id} mono />
                <MetadataItem label='Status' value={<StatusBadge status={detail.run.status} />} />
                <MetadataItem
                  label='Path'
                  value={detail.run.pathName || 'Untitled'}
                  hint={detail.run.pathId ?? undefined}
                />
                <MetadataItem label='Entity' value={detail.run.entityId} />
                <MetadataItem
                  label='Retries'
                  value={`${detail.run.retryCount ?? 0}/${detail.run.maxAttempts ?? 0}`}
                />
                <MetadataItem
                  label='Dead-lettered'
                  value={formatTimestamp(detail.run.deadLetteredAt ?? detail.run.updatedAt)}
                />

                <div className='md:col-span-3 space-y-1.5'>
                  <Hint size='xxs' uppercase className='text-gray-600 font-bold ml-1'>
                    Error Message
                  </Hint>
                  <Alert variant='error' className='px-3 py-3 text-xs leading-relaxed'>
                    {detail.run.errorMessage || 'No error message provided.'}
                  </Alert>
                </div>

                {nodeStatusSummary && (
                  <div className='md:col-span-3 space-y-2 mt-2 px-1'>
                    <div className='flex justify-between items-center'>
                      <Hint size='xxs' uppercase className='font-bold text-gray-500'>
                        Progress: {nodeStatusSummary.completed}/{nodeStatusSummary.totalNodes} Nodes
                      </Hint>
                      <Badge
                        variant='outline'
                        className='bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-1.5 py-0'
                      >
                        {nodeStatusSummary.progress}%
                      </Badge>
                    </div>
                    <div className='h-1.5 w-full overflow-hidden rounded-full bg-black/40'>
                      <div
                        className='h-full rounded-full bg-emerald-500/60 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        style={{ width: `${nodeStatusSummary.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </FormSection>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Hint size='xs' uppercase className='font-semibold text-gray-500'>
                  Nodes Execution
                </Hint>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='xs'
                    onClick={() => setShowRetryFailedConfirm(true)}
                    disabled={
                      retryFailedPending ||
                      !detail.nodes.some((n) => n.status === 'failed' || n.status === 'blocked')
                    }
                  >
                    Retry Failed Nodes
                  </Button>
                </div>
              </div>

              <Card
                variant='subtle'
                padding='none'
                className='border-border bg-gray-950/20 overflow-hidden'
              >
                <DataTable
                  columns={[
                    {
                      accessorKey: 'nodeId',
                      header: 'Node',
                      cell: ({ row }) => (
                        <div className='flex flex-col'>
                          <span className='font-mono text-[11px] text-gray-200'>
                            {row.original.nodeId}
                          </span>
                          <span className='text-[10px] text-gray-500'>
                            {row.original.nodeTitle || row.original.nodeType}
                          </span>
                        </div>
                      ),
                    },
                    {
                      accessorKey: 'status',
                      header: 'Status',
                      cell: ({ row }) => (
                        <StatusBadge status={row.original.status} size='sm' className='font-bold' />
                      ),
                    },
                    {
                      id: 'details',
                      header: 'Details',
                      cell: ({ row }) => {
                        const hasData =
                          Boolean(row.original.inputs) || Boolean(row.original.outputs);
                        const isExpanded = row.getIsExpanded();
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
                      },
                    },
                    {
                      id: 'actions',
                      header: () => <div className='text-right'>Action</div>,
                      cell: ({ row }) => {
                        const isRetryable =
                          row.original.status === 'failed' || row.original.status === 'blocked';
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
                      },
                    },
                  ]}
                  data={detail.nodes}
                  getRowId={(row) => row.nodeId}
                  expanded={useMemo(() => {
                    const state: Record<string, boolean> = {};
                    expandedNodeIds.forEach((id) => {
                      state[id] = true;
                    });
                    return state;
                  }, [expandedNodeIds])}
                  renderRowDetails={({ row }) => (
                    <div className='p-4 bg-black/40 border-t border-white/5'>
                      <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-1'>
                          <Hint size='xxs' uppercase className='text-gray-600 font-bold'>
                            Inputs
                          </Hint>
                          <Card
                            variant='subtle-compact'
                            padding='sm'
                            className='border-white/5 bg-black/40 overflow-auto max-h-40 font-mono text-[10px]'
                          >
                            {JSON.stringify(row.original.inputs || {}, null, 2)}
                          </Card>
                        </div>
                        <div className='space-y-1'>
                          <Hint size='xxs' uppercase className='text-gray-600 font-bold'>
                            Outputs
                          </Hint>
                          <Card
                            variant='subtle-compact'
                            padding='sm'
                            className='border-white/5 bg-black/40 overflow-auto max-h-40 font-mono text-[10px]'
                          >
                            {JSON.stringify(row.original.outputs || {}, null, 2)}
                          </Card>
                        </div>
                      </div>
                    </div>
                  )}
                />
              </Card>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Hint size='xs' uppercase className='font-semibold text-gray-500'>
                    Event Log
                  </Hint>
                  {eventsOverflow && (
                    <StatusBadge
                      status='Truncated'
                      variant='warning'
                      size='sm'
                      className='font-bold'
                    />
                  )}
                </div>
                <span className='text-[10px] text-gray-600'>{detail.events.length} Events</span>
              </div>

              <Card
                variant='subtle'
                padding='none'
                className='border-border bg-black/30 overflow-hidden'
              >
                <div className='max-h-60 overflow-y-auto divide-y divide-white/5'>
                  {detail.events.map((event: AiPathRunEventRecord) => (
                    <div key={event.id} className='p-2 hover:bg-white/5 transition-colors'>
                      <div className='flex justify-between text-[10px] mb-1'>
                        <span className='text-gray-500'>{formatTimestamp(event.createdAt)}</span>
                        <StatusBadge
                          status={event.level}
                          variant={
                            event.level === 'error'
                              ? 'error'
                              : event.level === 'warn'
                                ? 'warning'
                                : 'info'
                          }
                          size='sm'
                          className='font-bold'
                        />
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
              </Card>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<AlertCircle className='size-12 text-rose-500' />}
            title='Could not load details'
            description='The run record might have been deleted or there was a problem fetching the data.'
          />
        )}
      </DetailModal>

      <ConfirmModal
        isOpen={showRetryFailedConfirm}
        onClose={() => setShowRetryFailedConfirm(false)}
        onConfirm={() => {
          void handleRetryFailedNodes();
        }}
        title='Retry failed nodes?'
        message='All failed or blocked nodes in this run will be requeued. This will reset their status to pending and enqueue the run.'
        confirmText='Retry failed nodes'
        isDangerous={false}
        loading={retryFailedPending}
      />
    </AdminWidePageLayout>
  );
}
