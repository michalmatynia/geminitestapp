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

import type { ColumnDef, Row } from '@tanstack/react-table';

const toTimestamp = (value: string | null | undefined): number => {
  if (value === null || value === undefined || value.length === 0) return 0;
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

type DatabaseColumnsConfig = {
  backupMaintenanceAllowed: boolean;
  handlePreview: (backupName: string) => void;
  handleRestoreRequest: (backup: DatabaseInfo) => void;
  handleDeleteRequest: (backupName: string) => void;
};

const renderDatabaseActionsCell = (
  backup: DatabaseInfo,
  {
    backupMaintenanceAllowed,
    handlePreview,
    handleRestoreRequest,
    handleDeleteRequest,
  }: DatabaseColumnsConfig
): React.JSX.Element => {
  return (
    <div className='flex justify-end'>
      <ActionMenu>
        <DropdownMenuItem onClick={() => handlePreview(backup.name)}>Preview</DropdownMenuItem>
        <DropdownMenuItem
          disabled={!backupMaintenanceAllowed}
          title={
            !backupMaintenanceAllowed
              ? 'Disabled by Database Engine operation controls'
              : undefined
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
            !backupMaintenanceAllowed
              ? 'Disabled by Database Engine operation controls'
              : undefined
          }
          onClick={() => handleDeleteRequest(backup.name)}
        >
          Delete
        </DropdownMenuItem>
      </ActionMenu>
    </div>
  );
};

export const buildDatabaseColumns = ({
  backupMaintenanceAllowed,
  handlePreview,
  handleRestoreRequest,
  handleDeleteRequest,
}: DatabaseColumnsConfig): ColumnDef<DatabaseInfo>[] => [
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
    cell: ({ row }: { row: { original: DatabaseInfo } }): React.JSX.Element =>
      renderDatabaseActionsCell(row.original, {
        backupMaintenanceAllowed,
        handlePreview,
        handleRestoreRequest,
        handleDeleteRequest,
      }),
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
