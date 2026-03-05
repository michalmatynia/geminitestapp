'use client';

import React from 'react';

import type { UnifiedCollection } from '@/shared/contracts/database';
import { Button, StatusBadge, DataTableSortableHeader, SelectSimple } from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

export type UnifiedCollectionRow = UnifiedCollection;

type ProviderBadgeRuntimeValue = {
  count: number | null;
};

const ProviderBadgeRuntimeContext = React.createContext<ProviderBadgeRuntimeValue | null>(null);

function useProviderBadgeRuntime(): ProviderBadgeRuntimeValue {
  const runtime = React.useContext(ProviderBadgeRuntimeContext);
  if (!runtime) {
    throw new Error('useProviderBadgeRuntime must be used within ProviderBadgeRuntimeContext.Provider');
  }
  return runtime;
}

function ProviderBadgeStatus(): React.JSX.Element {
  const { count } = useProviderBadgeRuntime();
  return (
    <StatusBadge
      status={count !== null ? count.toLocaleString() : '?'}
      variant='success'
      size='sm'
    />
  );
}

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
  return (
    <ProviderBadgeRuntimeContext.Provider value={{ count }}>
      <ProviderBadgeStatus />
    </ProviderBadgeRuntimeContext.Provider>
  );
};

export function getControlPanelColumns(options: {
  onCopyToMongo: (collectionName: string) => void;
  onCopyToPrisma: (collectionName: string) => void;
  onProviderChange: (collectionName: string, provider: 'mongodb' | 'prisma' | 'auto') => void;
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
      id: 'prisma',
      header: 'Prisma',
      cell: ({ row }: { row: { original: UnifiedCollectionRow } }): React.JSX.Element => (
        <ProviderBadge
          exists={row.original.existsInPrisma}
          count={row.original.prismaRowCount}
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
            options.onProviderChange(row.original.name, value as 'mongodb' | 'prisma' | 'auto');
          }}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'mongodb', label: 'MongoDB' },
            { value: 'prisma', label: 'Prisma' },
          ]}
          size='sm'
          className='w-32'
          triggerClassName='h-8'
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: { original: UnifiedCollectionRow } }): React.JSX.Element => {
        const { name, existsInMongo, existsInPrisma } = row.original;
        return (
          <div className='flex gap-1'>
            {existsInPrisma && (
              <Button
                variant='outline'
                size='sm'
                onClick={(): void => options.onCopyToMongo(name)}
                title='Copy from Prisma to MongoDB'
                className='border-gray-700 text-xs text-gray-300 hover:bg-gray-800'
              >
                → Mongo
              </Button>
            )}
            {existsInMongo && (
              <Button
                variant='outline'
                size='sm'
                onClick={(): void => options.onCopyToPrisma(name)}
                title='Copy from MongoDB to Prisma'
                className='border-gray-700 text-xs text-gray-300 hover:bg-gray-800'
              >
                → Prisma
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
