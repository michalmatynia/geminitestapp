'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import { StandardDataTablePanel, StandardDataTablePanelRuntimeContext } from '@/shared/ui';

import { type JobRowData } from '../types';
import { useJobTablePanelRuntime } from './context/JobTableRuntimeContext';
import { JobActionsCell } from './job-table/JobActionsCell';
import { JobStatusCell } from './job-table/JobStatusCell';
import { JobTimingCell } from './job-table/JobTimingCell';

import type { ColumnDef } from '@tanstack/react-table';

interface JobTableProps {
  data: JobRowData[];
  isLoading?: boolean | undefined;
}

export function JobTable(props: JobTableProps): React.JSX.Element {
  const { data, isLoading } = props;
  const { header, alerts, filters, footer } = useJobTablePanelRuntime();
  const panelRuntimeValue = useMemo(
    () => ({
      header,
      alerts,
      filters,
      footer,
    }),
    [alerts, filters, footer, header]
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
          return <JobActionsCell jobId={job.id} status={job.status} />;
        },
      },
    ],
    []
  );

  return (
    <StandardDataTablePanelRuntimeContext.Provider value={panelRuntimeValue}>
      <StandardDataTablePanel columns={columns} data={data} isLoading={isLoading} />
    </StandardDataTablePanelRuntimeContext.Provider>
  );
}
