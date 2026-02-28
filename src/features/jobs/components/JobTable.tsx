'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import { useJobsContext } from '@/features/jobs/context/JobsContext';
import { StandardDataTablePanel } from '@/shared/ui';

import { type JobRowData } from '../types';
import { JobStatusCell } from './job-table/JobStatusCell';
import { JobTimingCell } from './job-table/JobTimingCell';
import { JobActionsCell } from './job-table/JobActionsCell';

import type { ColumnDef } from '@tanstack/react-table';

interface JobTableProps {
  data: JobRowData[];
  isLoading?: boolean | undefined;
  onViewDetails?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  isCancelling?: (jobId: string) => boolean;
  isDeleting?: (jobId: string) => boolean;

  // Panel props
  header?: React.ReactNode;
  alerts?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
}

export function JobTable({
  data,
  isLoading,
  onViewDetails: onViewDetailsProp,
  onCancel: onCancelProp,
  onDelete,
  isCancelling: isCancellingProp,
  isDeleting,
  header,
  alerts,
  filters,
  footer,
}: JobTableProps): React.JSX.Element {
  const { setSelectedListing, listingJobs, confirmCancelListing, isCancellingListing } =
    useJobsContext();

  const handleViewDetails = useMemo(
    () =>
      onViewDetailsProp ||
      ((id: string) => {
        const row = listingJobs
          .flatMap((j) => j.listings.map((l) => ({ job: j, listing: l })))
          .find((r) => r.listing.id === id);
        if (row) setSelectedListing(row);
      }),
    [onViewDetailsProp, listingJobs, setSelectedListing]
  );

  const handleCancel = useMemo(
    () =>
      onCancelProp ||
      ((id: string) => {
        const row = listingJobs
          .flatMap((j) => j.listings.map((l) => ({ job: j, listing: l })))
          .find((r) => r.listing.id === id);
        if (row) confirmCancelListing(row.job.productId, row.listing.id);
      }),
    [onCancelProp, listingJobs, confirmCancelListing]
  );

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
          return <JobStatusCell status={job.status} errorMessage={job.errorMessage} />;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Timing',
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return <JobTimingCell createdAt={job.createdAt} finishedAt={job.finishedAt} />;
        },
      },
      {
        id: 'actions',
        header: (): React.JSX.Element => <div className='text-right'>Actions</div>,
        cell: ({ row }: { row: { original: JobRowData } }): React.JSX.Element => {
          const job = row.original;
          return (
            <JobActionsCell
              jobId={job.id}
              status={job.status}
              onViewDetails={handleViewDetails}
              onCancel={handleCancel}
              onDelete={onDelete}
              isCancelling={isCancelling?.(job.id) ?? false}
              isDeleting={isDeleting?.(job.id) ?? false}
            />
          );
        },
      },
    ],
    [handleViewDetails, handleCancel, onDelete, isCancelling, isDeleting]
  );

  return (
    <StandardDataTablePanel
      columns={columns}
      data={data}
      isLoading={isLoading}
      header={header}
      alerts={alerts}
      filters={filters}
      footer={footer}
    />
  );
}
