'use client';

import { useMemo } from 'react';

import { StatusBadge } from '@/shared/ui';

import { useFileUploadEventsContext } from '../contexts/FileUploadEventsContext';
import { type FileUploadEventRecord } from '../hooks/useFileUploadEvents';

import type { ColumnDef } from '@tanstack/react-table';

export function useFileUploadEventsTableProps() {
  const { events, isFetching: isLoading } = useFileUploadEventsContext();

  const columns = useMemo<ColumnDef<FileUploadEventRecord>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Time',
        cell: ({ getValue }) => {
          const value = getValue() as string | Date;
          const date = value instanceof Date ? value : new Date(value);
          return (
            <span className='text-xs text-gray-400'>
              {Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={String(getValue() ?? 'unknown')} />,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => <span className='text-xs'>{String(getValue() ?? '—')}</span>,
      },
      {
        accessorKey: 'projectId',
        header: 'Project',
        cell: ({ getValue }) => <span className='text-xs'>{String(getValue() ?? '—')}</span>,
      },
      {
        accessorKey: 'filename',
        header: 'File',
        cell: ({ row }) => (
          <div className='text-xs'>
            <div className='font-medium text-gray-200'>{row.original.filename ?? '—'}</div>
            <div className='max-w-[280px] truncate text-[10px] text-gray-500'>
              {row.original.filepath ?? ''}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ getValue }) => {
          const size = getValue() as number;
          return <span className='text-xs'>{size ? `${Math.round(size / 1024)} KB` : '—'}</span>;
        },
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ getValue }) => <span className='text-xs'>{String(getValue() ?? '—')}</span>,
      },
      {
        accessorKey: 'errorMessage',
        header: 'Error',
        cell: ({ getValue }) => <span className='text-xs text-rose-200'>{String(getValue() ?? '—')}</span>,
      },
    ],
    []
  );

  return useMemo(
    () => ({
      columns,
      data: events,
      isLoading,
    }),
    [columns, events, isLoading]
  );
}
