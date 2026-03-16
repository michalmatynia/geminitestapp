'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { UnifiedCollection } from '@/shared/contracts/database';
import { StatusBadge, DataTableSortableHeader, SelectSimple } from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

export type UnifiedCollectionRow = UnifiedCollection;

const PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'auto' | 'mongodb' | 'redis'>>;

const ProviderBadge = ({
  exists,
  count,
}: {
  exists: boolean;
  count: number | null;
}): React.JSX.Element => {
  if (!exists) {
    return <span className='text-xs text-gray-500'>--</span>;
  }
  const statusValue = count !== null ? count.toLocaleString() : '?';

  return <StatusBadge status={statusValue} variant='success' size='sm' />;
};

export function getControlPanelColumns(options: {
  onProviderChange: (collectionName: string, provider: 'mongodb' | 'redis' | 'auto') => void;
}): ColumnDef<UnifiedCollectionRow>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableSortableHeader label='Collection' column={column} />,
      cell: ({ row }: { row: { original: UnifiedCollectionRow } }): React.JSX.Element => (
        <span className='font-mono text-sm text-gray-100'>{row.original.name}</span>
      ),
    },
    {
      id: 'mongodb',
      header: 'MongoDB',
      cell: ({ row }: { row: { original: UnifiedCollectionRow } }): React.JSX.Element => (
        <ProviderBadge
          exists={row.original.existsInMongo}
          count={row.original.mongoDocumentCount}
        />
      ),
    },
    {
      id: 'assignedProvider',
      header: 'Active Provider',
      cell: ({ row }: { row: { original: UnifiedCollectionRow } }): React.JSX.Element => (
        <SelectSimple
          value={row.original.assignedProvider}
          onValueChange={(value): void => {
            options.onProviderChange(row.original.name, value as 'mongodb' | 'redis' | 'auto');
          }}
          options={[...PROVIDER_OPTIONS]}
          size='sm'
          className='w-32'
          triggerClassName='h-8'
         ariaLabel='Select option' title='Select option'/>
      ),
    },
  ];
}
