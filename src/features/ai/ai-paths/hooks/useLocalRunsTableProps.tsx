'use client';

import { useMemo } from 'react';

import type { AiPathLocalRunRecord } from '@/shared/lib/ai-paths';
import { StatusBadge } from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const formatDuration = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value < 1000) return `${Math.max(0, Math.round(value))}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const formatEntity = (run: AiPathLocalRunRecord): string => {
  if (!run.entityType && !run.entityId) return '-';
  if (run.entityType && run.entityId) return `${run.entityType}:${run.entityId}`;
  return run.entityType ?? run.entityId ?? '-';
};

export function useLocalRunsTableProps(runs: AiPathLocalRunRecord[], isLoading: boolean) {
  const columns = useMemo<ColumnDef<AiPathLocalRunRecord>[]>(
    () => [
      {
        accessorKey: 'startedAt',
        header: 'Started',
        cell: ({ getValue }) => (
          <span className='text-xs text-gray-300'>{formatDate(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'pathName',
        header: 'Path',
        cell: ({ row }) => (
          <div className='text-xs'>
            <div className='font-medium text-gray-100'>
              {row.original.pathName ?? 'Untitled path'}
            </div>
            <div className='text-[10px] text-gray-500'>{row.original.pathId ?? '-'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'triggerLabel',
        header: 'Trigger',
        cell: ({ row }) => (
          <div className='text-xs'>
            <div className='font-medium text-gray-100'>
              {row.original.triggerLabel ?? row.original.triggerEvent ?? '-'}
            </div>
            <div className='text-[10px] text-gray-500'>{row.original.triggerEvent ?? '-'}</div>
          </div>
        ),
      },
      {
        id: 'entity',
        header: 'Entity',
        cell: ({ row }) => (
          <span className='text-xs text-gray-300'>{formatEntity(row.original)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status}
            variant={row.original.status === 'success' ? 'success' : 'error'}
            size='sm'
            title={row.original.error ?? ''}
            className='font-bold'
          />
        ),
      },
      {
        accessorKey: 'durationMs',
        header: 'Duration',
        cell: ({ getValue }) => (
          <span className='text-xs text-gray-300'>{formatDuration(getValue() as number)}</span>
        ),
      },
    ],
    []
  );

  return useMemo(
    () => ({
      columns,
      data: runs,
      isLoading,
    }),
    [columns, runs, isLoading]
  );
}
