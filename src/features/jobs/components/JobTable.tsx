'use client';

import { Eye, XCircle, Loader2, Trash2, Clock, CheckCircle } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import { useJobsContext } from '@/features/jobs/context/JobsContext';
import { DataTable, StatusBadge } from '@/shared/ui';
import { Button } from '@/shared/ui';

import { type JobRowData } from '../types';

import type { ColumnDef } from '@tanstack/react-table';

interface JobTableProps {
  data: JobRowData[];
  isLoading?: boolean | undefined;
  onViewDetails?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  isCancelling?: (jobId: string) => boolean;
  isDeleting?: (jobId: string) => boolean;
}

const getStatusIcon = (status: string): React.JSX.Element => {
  switch (status) {
    case 'pending':
    case 'queued':
    case 'queued_relist':
      return <Clock className='size-3' />;
    case 'completed':
    case 'success':
    case 'listed':
      return <CheckCircle className='size-3' />;
    case 'deleted':
    case 'removed':
    case 'failed':
    case 'needs_login':
    case 'auth_required':
    case 'error':
    case 'canceled':
    case 'cancelled':
      return <XCircle className='size-3' />;
    case 'processing':
    case 'running':
    case 'in_progress':
      return <Loader2 className='size-3 animate-spin' />;
    default:
      return <Clock className='size-3' />;
  }
};

export function JobTable({
  data,
  isLoading,
  onViewDetails: onViewDetailsProp,
  onCancel: onCancelProp,
  onDelete,
  isCancelling: isCancellingProp,
  isDeleting,
}: JobTableProps): React.JSX.Element {
  const { 
    setSelectedListing, 
    listingJobs, 
    handleCancelListing, 
    isCancellingListing 
  } = useJobsContext();

  const handleViewDetails = useMemo(() => onViewDetailsProp || ((id: string) => {
    const row = listingJobs.flatMap(j => j.listings.map(l => ({ job: j, listing: l }))).find(r => r.listing.id === id);
    if (row) setSelectedListing(row);
  }), [onViewDetailsProp, listingJobs, setSelectedListing]);

  const handleCancel = useMemo(() => onCancelProp || ((id: string) => {
    const row = listingJobs.flatMap(j => j.listings.map(l => ({ job: j, listing: l }))).find(r => r.listing.id === id);
    if (row) void handleCancelListing(row.job.productId, row.listing.id);
  }), [onCancelProp, listingJobs, handleCancelListing]);

  const isCancelling = isCancellingProp || isCancellingListing;

  const columns = useMemo<ColumnDef<JobRowData>[]>(
    () => [
      {
        accessorKey: 'entityName',
        header: 'Entity / Product',
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <div className='flex items-start gap-2'>
              <div>
                <div className='font-medium text-white'>{job.entityName}</div>
                {job.entitySubText && (
                  <div className='text-xs text-gray-500'>{job.entitySubText}</div>
                )}
              </div>
              {job.productId && (
                <Link
                  href={`/admin/products?id=${job.productId}`}
                  className='text-blue-400 hover:text-blue-300'
                  aria-label='Open product'
                >
                  <ExternalLink className='size-4' />
                </Link>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'type',
        header: 'Type / ID',
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <>
              <div className='text-xs font-mono'>{job.type}</div>
              <div className='text-[10px] text-gray-600'>{job.id}</div>
            </>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <div className='flex flex-col gap-1'>
              <StatusBadge status={job.status} icon={getStatusIcon(job.status)} />
              {job.errorMessage && (
                <div className='max-w-[200px] truncate text-[10px] text-red-400' title={job.errorMessage}>
                  {job.errorMessage}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Timing',
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          const formatTime = (value: string | Date | null | undefined): string => {
            if (!value) return '—';
            const date = new Date(value);
            return date.toLocaleTimeString();
          };
          return (
            <div className='text-xs'>
              <div>Created: {formatTime(job.createdAt)}</div>
              {job.finishedAt && (
                <div className='text-gray-500'>Finished: {formatTime(job.finishedAt)}</div>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: (): React.JSX.Element => <div className='text-right'>Actions</div>,
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <div className='flex justify-end gap-2'>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 text-blue-500 hover:text-blue-400'
                onClick={() => handleViewDetails(job.id)}
                aria-label='View details'
              >
                <Eye className='h-4 w-4' />
              </Button>
              {(job.status === 'pending' ||
                job.status === 'queued' ||
                job.status === 'queued_relist' ||
                job.status === 'running') && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-yellow-500 hover:text-yellow-400'
                  onClick={() => handleCancel(job.id)}
                  disabled={isCancelling?.(job.id)}
                  aria-label='Cancel job'
                >
                  {isCancelling?.(job.id) ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <XCircle className='h-4 w-4' />
                  )}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-red-500 hover:text-red-400'
                  onClick={() => onDelete(job.id)}
                  disabled={isDeleting?.(job.id)}
                  aria-label='Delete job'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleViewDetails, handleCancel, onDelete, isCancelling, isDeleting]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      {...(isLoading !== undefined ? { isLoading } : {})}
    />
  );
}
