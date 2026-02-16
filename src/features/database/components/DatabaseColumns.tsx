'use client';

import { Button, DataTableSortableHeader } from '@/shared/ui';

import type { DatabaseInfo } from '../types';
import type { ColumnDef, Row } from '@tanstack/react-table';


export const getDatabaseColumns = (options?: {
  onPreview?: (backupName: string) => void;
  onRestoreRequest?: (backup: DatabaseInfo) => void;
  onDeleteRequest?: (backupName: string) => void;
  disableRestore?: boolean;
  disableDelete?: boolean;
  restoreDisabledReason?: string;
  deleteDisabledReason?: string;
}): ColumnDef<DatabaseInfo>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableSortableHeader label='Name' column={column} />
    ),
  },
  {
    accessorKey: 'size',
    header: ({ column }) => (
      <DataTableSortableHeader label='Size' column={column} />
    ),
    sortingFn: (rowA: Row<DatabaseInfo>, rowB: Row<DatabaseInfo>, columnId: string): number => {
      const toNumber = (value: string): number =>
        Number.parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
      return (
        toNumber(rowA.getValue<string>(columnId)) - toNumber(rowB.getValue<string>(columnId))
      );
    },
  },
  {
    id: 'createdAt',
    accessorFn: (row: DatabaseInfo): number => new Date(row.createdAt).getTime(),
    header: ({ column }) => (
      <DataTableSortableHeader label='Created' column={column} />
    ),
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode => row.original.created,
  },
  {
    id: 'lastModifiedAt',
    accessorFn: (row: DatabaseInfo): number => new Date(row.lastModifiedAt).getTime(),
    header: ({ column }) => (
      <DataTableSortableHeader label='Last Modified' column={column} />
    ),
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode => row.original.lastModified,
  },
  {
    accessorKey: 'lastRestored',
    header: 'Last Restored',
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode => row.original.lastRestored || 'Never',
  },
  {
    id: 'actions',
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.JSX.Element => {
      const backup = row.original;
      return (
        <div className='flex space-x-2'>
          {options?.onPreview && (
            <Button
              variant='secondary'
              onClick={(): void => options.onPreview?.(backup.name)}
            >
              Preview
            </Button>
          )}

          <Button
            disabled={Boolean(options?.disableRestore)}
            title={options?.disableRestore ? options.restoreDisabledReason : undefined}
            onClick={(): void => {
              options?.onRestoreRequest?.(backup);
            }}
          >
            Restore
          </Button>

          <Button
            variant='destructive'
            disabled={Boolean(options?.disableDelete)}
            title={options?.disableDelete ? options.deleteDisabledReason : undefined}
            onClick={(): void => {
              options?.onDeleteRequest?.(backup.name);
            }}
          >
            Delete
          </Button>
        </div>
      );
    },
  },
];
