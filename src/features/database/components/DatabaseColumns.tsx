'use client';

import React from 'react';

import type { DatabaseInfo } from '@/shared/contracts/database';
import {
  ActionMenu,
  DataTableSortableHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';

import {
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext,
} from '../context/DatabaseBackupsContext';

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

type DatabaseActionsRuntimeValue = {
  backup: DatabaseInfo;
  backupMaintenanceAllowed: boolean;
  handlePreview: (backupName: string) => void;
  handleRestoreRequest: (backup: DatabaseInfo) => void;
  handleDeleteRequest: (backupName: string) => void;
};

const DatabaseActionsRuntimeContext = React.createContext<DatabaseActionsRuntimeValue | null>(null);

function useDatabaseActionsRuntime(): DatabaseActionsRuntimeValue {
  const runtime = React.useContext(DatabaseActionsRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useDatabaseActionsRuntime must be used within DatabaseActionsRuntimeContext.Provider'
    );
  }
  return runtime;
}

function DatabaseActionsPreviewItem(): React.JSX.Element {
  const { backup, handlePreview } = useDatabaseActionsRuntime();
  return <DropdownMenuItem onClick={() => handlePreview(backup.name)}>Preview</DropdownMenuItem>;
}

function DatabaseActionsRestoreItem(): React.JSX.Element {
  const { backup, backupMaintenanceAllowed, handleRestoreRequest } = useDatabaseActionsRuntime();
  return (
    <DropdownMenuItem
      disabled={!backupMaintenanceAllowed}
      title={
        !backupMaintenanceAllowed ? 'Disabled by Database Engine operation controls' : undefined
      }
      onClick={() => handleRestoreRequest(backup)}
    >
      Restore
    </DropdownMenuItem>
  );
}

function DatabaseActionsDeleteItem(): React.JSX.Element {
  const { backup, backupMaintenanceAllowed, handleDeleteRequest } = useDatabaseActionsRuntime();
  return (
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
  );
}

function DatabaseActionsCell({ backup }: { backup: DatabaseInfo }): React.JSX.Element {
  const { backupMaintenanceAllowed } = useDatabaseBackupsStateContext();
  const { handlePreview, handleRestoreRequest, handleDeleteRequest } =
    useDatabaseBackupsActionsContext();

  const runtimeValue = React.useMemo<DatabaseActionsRuntimeValue>(
    () => ({
      backup,
      backupMaintenanceAllowed,
      handlePreview,
      handleRestoreRequest,
      handleDeleteRequest,
    }),
    [backup, backupMaintenanceAllowed, handlePreview, handleRestoreRequest, handleDeleteRequest]
  );

  return (
    <div className='flex justify-end'>
      <DatabaseActionsRuntimeContext.Provider value={runtimeValue}>
        <ActionMenu>
          <DatabaseActionsPreviewItem />
          <DatabaseActionsRestoreItem />
          <DropdownMenuSeparator />
          <DatabaseActionsDeleteItem />
        </ActionMenu>
      </DatabaseActionsRuntimeContext.Provider>
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
