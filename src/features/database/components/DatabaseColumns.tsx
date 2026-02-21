'use client';

import type { DatabaseInfo } from '@/shared/contracts/database';
import { ActionMenu, DataTableSortableHeader, DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui';

import type { ColumnDef, Row } from '@tanstack/react-table';

const toTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toLocale = (value: string | null | undefined): string => {
  const ts = toTimestamp(value);
  return ts > 0 ? new Date(ts).toLocaleString() : '—';
};

const resolveLastModifiedAt = (row: DatabaseInfo): string =>
  row.lastModifiedAt ?? row.createdAt;

const resolveLastRestored = (row: DatabaseInfo): string => row.lastRestored ?? 'Never';

const toSizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
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
    header: ({ column }) => (
      <DataTableSortableHeader label='Name' column={column} />
    ),
  },
  {
    accessorKey: 'size',
    header: ({ column }) => (
      <DataTableSortableHeader label='Size' column={column} />
    ),
    sortingFn: (rowA: Row<DatabaseInfo>, rowB: Row<DatabaseInfo>, columnId: string): number =>
      toSizeNumber(rowA.getValue(columnId)) - toSizeNumber(rowB.getValue(columnId)),
  },
  {
    id: 'createdAt',
    accessorFn: (row: DatabaseInfo): number => toTimestamp(row.createdAt),
    header: ({ column }) => (
      <DataTableSortableHeader label='Created' column={column} />
    ),
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode =>
      toLocale(row.original.createdAt),
  },
  {
    id: 'lastModifiedAt',
    accessorFn: (row: DatabaseInfo): number => toTimestamp(resolveLastModifiedAt(row)),
    header: ({ column }) => (
      <DataTableSortableHeader label='Last Modified' column={column} />
    ),
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode =>
      toLocale(resolveLastModifiedAt(row.original)),
  },
  {
    accessorKey: 'lastRestored',
    header: 'Last Restored',
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode =>
      resolveLastRestored(row.original),
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
