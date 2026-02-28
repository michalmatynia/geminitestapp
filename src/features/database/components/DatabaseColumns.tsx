'use client';

import type { DatabaseInfo } from '@/shared/contracts/database';
import {
  ActionMenu,
  DataTableSortableHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';

import { useDatabaseBackupsContext } from '../context/DatabaseBackupsContext';

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

const resolveLastModifiedAt = (row: DatabaseInfo): string => row.lastModifiedAt ?? row.createdAt;

const resolveLastRestored = (row: DatabaseInfo): string => row.lastRestored ?? 'Never';

const toSizeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

function DatabaseActionsCell({ backup }: { backup: DatabaseInfo }): React.JSX.Element {
  const { handlePreview, handleRestoreRequest, handleDeleteRequest, backupMaintenanceAllowed } =
    useDatabaseBackupsContext();

  return (
    <div className='flex justify-end'>
      <ActionMenu>
        <DropdownMenuItem onClick={() => handlePreview(backup.name)}>Preview</DropdownMenuItem>
        <DropdownMenuItem
          disabled={!backupMaintenanceAllowed}
          title={
            !backupMaintenanceAllowed ? 'Disabled by Database Engine operation controls' : undefined
          }
          onClick={() => handleRestoreRequest(backup)}
        >
          Restore
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='text-destructive focus:text-destructive'
          disabled={!backupMaintenanceAllowed}
          title={
            !backupMaintenanceAllowed ? 'Disabled by Database Engine operation controls' : undefined
          }
          onClick={() => handleDeleteRequest(backup.name)}
        >
          Delete
        </DropdownMenuItem>
      </ActionMenu>
    </div>
  );
}

export const getDatabaseColumns = (): ColumnDef<DatabaseInfo>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableSortableHeader label='Name' column={column} />,
  },
  {
    accessorKey: 'size',
    header: ({ column }) => <DataTableSortableHeader label='Size' column={column} />,
    sortingFn: (rowA: Row<DatabaseInfo>, rowB: Row<DatabaseInfo>, columnId: string): number =>
      toSizeNumber(rowA.getValue(columnId)) - toSizeNumber(rowB.getValue(columnId)),
  },
  {
    id: 'createdAt',
    accessorFn: (row: DatabaseInfo): number => toTimestamp(row.createdAt),
    header: ({ column }) => <DataTableSortableHeader label='Created' column={column} />,
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.ReactNode =>
      toLocale(row.original.createdAt),
  },
  {
    id: 'lastModifiedAt',
    accessorFn: (row: DatabaseInfo): number => toTimestamp(resolveLastModifiedAt(row)),
    header: ({ column }) => <DataTableSortableHeader label='Last Modified' column={column} />,
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
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.JSX.Element => (
      <DatabaseActionsCell backup={row.original} />
    ),
  },
];
