'use client';

import { Button } from '@/shared/ui';

import type { DatabaseInfo } from '../types';
import type { ColumnDef, Column, Row } from '@tanstack/react-table';


// ✅ Use TanStack's Column type, and accept that the handler may be undefined.
const renderSortableHeader = <TData, TValue>(
  label: string,
  column: Column<TData, TValue>
): React.JSX.Element => {
  const direction = column.getIsSorted(); // false | "asc" | "desc"
  const handler = column.getToggleSortingHandler(); // ((event) => void) | undefined

  return (
    <Button
      type='button'
      onClick={handler ?? undefined}
      // optional: prevent "clickable" affordance if it can't sort
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
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader('Name', column),
  },
  {
    accessorKey: 'size',
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader('Size', column),
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
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader('Created', column),
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode => row.original.created,
  },
  {
    id: 'lastModifiedAt',
    accessorFn: (row: DatabaseInfo): number => new Date(row.lastModifiedAt).getTime(),
    header: ({ column }: { column: Column<DatabaseInfo, unknown> }): React.JSX.Element => renderSortableHeader('Last Modified', column),
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
