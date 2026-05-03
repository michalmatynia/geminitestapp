'use client';

import React from 'react';

import type { DatabaseInfo } from '@/shared/contracts/database';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { DataTableSortableHeader } from '@/shared/ui/data-display.public';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';

import {
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext,
} from '../context/DatabaseBackupsContext';

import type { ColumnDef } from '@tanstack/react-table';

const formatTimestamp = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—';
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? new Date(ts).toLocaleString() : '—';
};

const parseSize = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

type DatabaseColumnsConfig = {
  backupMaintenanceAllowed: boolean;
  handlePreview: (backupName: string) => void;
  handleRestoreRequest: (backup: DatabaseInfo) => void;
  handleDeleteRequest: (backupName: string) => void;
};

const DatabaseActionsCell = ({
  backup,
  config,
}: {
  backup: DatabaseInfo;
  config: DatabaseColumnsConfig;
}): React.JSX.Element => (
  <div className='flex justify-end'>
    <ActionMenu>
      <DropdownMenuItem onClick={() => config.handlePreview(backup.name)}>Preview</DropdownMenuItem>
      <DropdownMenuItem
        disabled={!config.backupMaintenanceAllowed}
        title={!config.backupMaintenanceAllowed ? 'Disabled by Database Engine operation controls' : undefined}
        onClick={() => config.handleRestoreRequest(backup)}
      >
        Restore
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className='text-destructive focus:text-destructive'
        disabled={!config.backupMaintenanceAllowed}
        title={!config.backupMaintenanceAllowed ? 'Disabled by Database Engine operation controls' : undefined}
        onClick={() => config.handleDeleteRequest(backup.name)}
      >
        Delete
      </DropdownMenuItem>
    </ActionMenu>
  </div>
);

export const buildDatabaseColumns = (config: DatabaseColumnsConfig): ColumnDef<DatabaseInfo>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableSortableHeader label='Name' column={column} />,
  },
  {
    accessorKey: 'size',
    header: ({ column }) => <DataTableSortableHeader label='Size' column={column} />,
    sortingFn: (a, b) => parseSize(a.getValue('size')) - parseSize(b.getValue('size')),
  },
  {
    id: 'createdAt',
    accessorFn: (row) => new Date(row.createdAt).getTime(),
    header: ({ column }) => <DataTableSortableHeader label='Created' column={column} />,
    cell: ({ row }) => formatTimestamp(row.original.createdAt),
  },
  {
    id: 'lastModifiedAt',
    accessorFn: (row) => new Date(row.lastModifiedAt ?? row.createdAt).getTime(),
    header: ({ column }) => <DataTableSortableHeader label='Last Modified' column={column} />,
    cell: ({ row }) => formatTimestamp(row.original.lastModifiedAt ?? row.original.createdAt),
  },
  {
    accessorKey: 'lastRestored',
    header: 'Last Restored',
    cell: ({ row }) => row.original.lastRestored ?? 'Never',
  },
  {
    id: 'actions',
    cell: ({ row }) => <DatabaseActionsCell backup={row.original} config={config} />,
  },
];



export const useDatabaseColumns = (): ColumnDef<DatabaseInfo>[] => {
  const { backupMaintenanceAllowed } = useDatabaseBackupsStateContext();
  const { handlePreview, handleRestoreRequest, handleDeleteRequest } =
    useDatabaseBackupsActionsContext();

  return React.useMemo(
    () =>
      buildDatabaseColumns({
        backupMaintenanceAllowed,
        handlePreview,
        handleRestoreRequest,
        handleDeleteRequest,
      }),
    [backupMaintenanceAllowed, handleDeleteRequest, handlePreview, handleRestoreRequest]
  );
};
