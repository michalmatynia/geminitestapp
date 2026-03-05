'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import { useJobsActions, useJobsState } from '@/shared/lib/jobs/context/JobsContext';
import { StandardDataTablePanel, StandardDataTablePanelRuntimeContext } from '@/shared/ui';

import { type JobRowData } from '../types';
import { JobStatusCell } from './job-table/JobStatusCell';
import { JobTimingCell } from './job-table/JobTimingCell';
import { JobActionsCell, JobActionsCellRuntimeContext } from './job-table/JobActionsCell';

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

export function JobTable(props: JobTableProps): React.JSX.Element {
  const {
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
  } = props;

  const { listingJobs } = useJobsState();
  const { setSelectedListing, confirmCancelListing, isCancellingListing } = useJobsActions();

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
  const panelRuntimeValue = useMemo(
    () => ({
      header,
      alerts,
      filters,
      footer,
    }),
    [alerts, filters, footer, header]
  );
  const actionsRuntimeValue = useMemo(
    () => ({
      onDelete,
      isDeleting,
    }),
    [isDeleting, onDelete]
  );

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
              isCancelling={isCancelling?.(job.id) ?? false}
            />
          );
        },
      },
    ],
    [handleViewDetails, handleCancel, isCancelling]
  );

  return (
    <StandardDataTablePanelRuntimeContext.Provider value={panelRuntimeValue}>
      <JobActionsCellRuntimeContext.Provider value={actionsRuntimeValue}>
        <StandardDataTablePanel columns={columns} data={data} isLoading={isLoading} />
      </JobActionsCellRuntimeContext.Provider>
    </StandardDataTablePanelRuntimeContext.Provider>
  );
}
