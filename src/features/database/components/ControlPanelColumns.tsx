'use client';

import { Button } from '@/shared/ui';

import type { ColumnDef, Column } from '@tanstack/react-table';

export type UnifiedCollectionRow = {
  name: string;
  mongoFieldCount: number | null;
  prismaFieldCount: number | null;
  mongoDocumentCount: number | null;
  prismaRowCount: number | null;
  existsInMongo: boolean;
  existsInPrisma: boolean;
  assignedProvider: 'mongodb' | 'prisma' | 'auto';
};

const renderSortableHeader = <TData, TValue>(
  label: string,
  column: Column<TData, TValue>
): React.JSX.Element => {
  const direction = column.getIsSorted();
  const handler = column.getToggleSortingHandler();
  return (
    <Button
      type='button'
      onClick={handler ?? undefined}
      disabled={!handler}
      className='inline-flex items-center gap-1 text-left text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60'
    >
      {label}
      <span className='text-xs text-muted-foreground'>
        {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}
      </span>
    </Button>
  );
};

const ProviderBadge = ({
  exists,
  count,
  label,
}: {
  exists: boolean;
  count: number | null;
  label: string;
}): React.JSX.Element => {
  if (!exists) {
    return <span className='text-xs text-gray-500'>--</span>;
  }
  return (
    <span
      className='inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
      title={label}
    >
      {count !== null ? count.toLocaleString() : '?'}
    </span>
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
      header: ({ column }: { column: Column<UnifiedCollectionRow, unknown> }): React.JSX.Element =>
        renderSortableHeader('Collection', column),
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
          label='MongoDB documents'
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
          label='Prisma rows'
        />
      ),
    },
    {
      id: 'assignedProvider',
      header: 'Active Provider',
      cell: ({ row }: { row: { original: UnifiedCollectionRow } }): React.JSX.Element => (
        <select
          value={row.original.assignedProvider}
          onChange={(e): void => {
            options.onProviderChange(
              row.original.name,
              e.target.value as 'mongodb' | 'prisma' | 'auto'
            );
          }}
          className='rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-600'
        >
          <option value='auto'>Auto</option>
          <option value='mongodb'>MongoDB</option>
          <option value='prisma'>Prisma</option>
        </select>
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
