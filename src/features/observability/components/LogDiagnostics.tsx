'use client';

import React, { useMemo } from 'react';

import { useSystemLogsContext } from '@/features/observability/context/SystemLogsContext';
import {
  type MongoIndexInfoDto as MongoIndexInfo,
  type MongoCollectionIndexStatusDto as MongoCollectionIndexStatus,
} from '@/shared/contracts/observability';
import { Button, StandardDataTablePanel, StatusBadge, Hint } from '@/shared/ui';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { formatTimestamp } from '../utils/formatTimestamp';

export function LogDiagnostics(): React.JSX.Element {
  const {
    diagnostics,
    diagnosticsUpdatedAt,
    mongoDiagnosticsQuery,
    confirmAction,
    handleRebuildMongoIndexes,
  } = useSystemLogsContext();

  const columns = useMemo<ColumnDef<MongoCollectionIndexStatus>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Collection',
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => (
          <StatusBadge
            status={row.original.name}
            variant='success'
            size='sm'
            className='font-mono'
          />
        ),
      },
      {
        accessorKey: 'expected',
        header: 'Expected',
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => (
          <span className='text-xs text-gray-400'>{row.original.expected.length}</span>
        ),
      },
      {
        accessorKey: 'missing',
        header: 'Missing',
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => {
          const missingCount = row.original.missing.length;
          if (row.original.error)
            return <StatusBadge status={row.original.error} variant='error' size='sm' />;
          if (missingCount === 0) return <span className='text-gray-600'>0</span>;
          return (
            <div className='flex flex-wrap items-center gap-1'>
              <span className='text-amber-400 font-bold mr-2'>{missingCount}</span>
              {row.original.missing.map((m: MongoIndexInfo, i: number) => (
                <StatusBadge
                  key={i}
                  status={JSON.stringify(m.key)}
                  variant='warning'
                  size='sm'
                  className='font-mono text-[9px]'
                />
              ))}
            </div>
          );
        },
      },
      {
        id: 'status',
        header: () => <div className='text-right'>Status</div>,
        cell: ({ row }: { row: Row<MongoCollectionIndexStatus> }) => {
          const missingCount = row.original.missing.length;
          return (
            <div className='text-right'>
              <StatusBadge
                status={
                  row.original.error ? 'Error' : missingCount === 0 ? 'Healthy' : 'Sync Required'
                }
                variant={row.original.error ? 'error' : missingCount === 0 ? 'success' : 'warning'}
                className='text-[9px]'
              />
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <StandardDataTablePanel
      title='Observability Index Health'
      description='Index consistency for observability storage collections.'
      headerActions={
        <div className='flex items-center gap-2'>
          {diagnosticsUpdatedAt ? (
            <Hint uppercase variant='muted' size='xs' className='font-semibold'>
              Updated {formatTimestamp(diagnosticsUpdatedAt)}
            </Hint>
          ) : null}
          <Button
            variant='outline'
            size='xs'
            onClick={() => void mongoDiagnosticsQuery.refetch()}
            disabled={mongoDiagnosticsQuery.isFetching}
          >
            Refresh
          </Button>
          <Button
            variant='outline'
            size='xs'
            onClick={() =>
              confirmAction({
                title: 'Restore Index Health',
                message:
                  'Initiate a background scan and reconstruction of missing observability indexes.',
                confirmText: 'Begin Rebuild',
                onConfirm: handleRebuildMongoIndexes,
              })
            }
            className='border-amber-500/20 text-amber-200 hover:bg-amber-500/5'
          >
            Rebuild Indexes
          </Button>
        </div>
      }
      variant='flat'
      columns={columns}
      data={diagnostics}
      isLoading={mongoDiagnosticsQuery.isLoading}
    />
  );
}
