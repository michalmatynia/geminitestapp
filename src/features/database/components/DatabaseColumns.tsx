'use client';

import { ActionMenu, DataTableSortableHeader, DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui';

import type { DatabaseInfo } from '@/shared/contracts/database';
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
        <div className='flex justify-end'>
          <ActionMenu>
            {options?.onPreview && (
              <DropdownMenuItem onClick={() => options.onPreview?.(backup.name)}>
                Preview
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={Boolean(options?.disableRestore)}
              title={options?.disableRestore ? options.restoreDisabledReason : undefined}
              onClick={() => options?.onRestoreRequest?.(backup)}
            >
              Restore
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-destructive focus:text-destructive'
              disabled={Boolean(options?.disableDelete)}
              title={options?.disableDelete ? options.deleteDisabledReason : undefined}
              onClick={() => options?.onDeleteRequest?.(backup.name)}
            >
              Delete
            </DropdownMenuItem>
          </ActionMenu>
        </div>
      );
    },
  },
];
