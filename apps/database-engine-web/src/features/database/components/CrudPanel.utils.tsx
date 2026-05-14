import type { ColumnDef } from '@tanstack/react-table';
import { EditIcon, Trash2Icon } from 'lucide-react';
import React from 'react';
import type {
  DatabaseColumnInfo,
  DatabaseEngineManagedMongoApplication,
  MongoSource,
} from '@/shared/contracts/database';
import { Button } from '@/shared/ui/primitives.public';
import { formatDatabaseCellValue } from './format-cell-value';

export interface RowData extends Record<string, unknown> {}

const MANAGED_APPLICATION_LABELS: Record<DatabaseEngineManagedMongoApplication, string> = {
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  products: 'Ecommerce',
  arch: 'Milkbar Designers',
};

const SOURCE_LABELS: Record<MongoSource, string> = {
  local: 'Local',
  cloud: 'Cloud',
};

export const buildDatabaseLabel = (
  application: DatabaseEngineManagedMongoApplication | undefined,
  source: MongoSource | undefined
): string => {
  if (application === undefined) return 'Current MongoDB';
  return `${MANAGED_APPLICATION_LABELS[application]} / ${SOURCE_LABELS[source ?? 'local']}`;
};

export const createActionColumn = (
  setEditingRow: (row: RowData) => void,
  setDeletingRow: (row: RowData) => void
): ColumnDef<RowData> => ({
  id: 'actions',
  header: 'Actions',
  cell: ({ row }) => (
    <div className='flex items-center gap-1'>
      <Button
        variant='ghost'
        size='xs'
        onClick={() => setEditingRow(row.original)}
        className='rounded p-1 text-gray-400 hover:bg-white/10 hover:text-blue-300'
        title='Edit row'
        aria-label='Edit row'
      >
        <EditIcon className='size-3.5' />
      </Button>
      <Button
        variant='ghost'
        size='xs'
        onClick={() => setDeletingRow(row.original)}
        className='rounded p-1 text-gray-400 hover:bg-white/10 hover:text-rose-300'
        title='Delete row'
        aria-label='Delete row'
      >
        <Trash2Icon className='size-3.5' />
      </Button>
    </div>
  ),
  size: 80,
});

export const createDataColumns = (keys: string[]): ColumnDef<RowData>[] => {
  return keys.map((key) => ({
    accessorKey: key,
    header: key,
    cell: ({ row }) => (
      <span
        className='font-mono text-xs text-gray-300 truncate block max-w-[200px]'
        title={formatDatabaseCellValue(row.original[key])}
      >
        {formatDatabaseCellValue(row.original[key])}
      </span>
    ),
  }));
};

export const inferColumnType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (
    typeof value === 'object' &&
    (value as { constructor?: { name?: string } }).constructor?.name === 'ObjectId'
  ) {
    return 'ObjectId';
  }
  return typeof value;
};

export const createFallbackColumnInfo = (name: string, value: unknown): DatabaseColumnInfo => ({
  name,
  type: inferColumnType(value),
  nullable: value === null,
  defaultValue: null,
  isPrimaryKey: name === '_id',
  isForeignKey: false,
});

export const mergeColumnInfoWithRows = (
  baseColumns: DatabaseColumnInfo[],
  rows: RowData[]
): DatabaseColumnInfo[] => {
  const columnsByName = new Map(baseColumns.map((column) => [column.name, column]));
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!columnsByName.has(key)) {
        columnsByName.set(key, createFallbackColumnInfo(key, value));
      }
    }
  }
  return [...columnsByName.values()].sort((left, right) => {
    if (left.name === '_id') return -1;
    if (right.name === '_id') return 1;
    return left.name.localeCompare(right.name);
  });
};

export const getVisibleColumnKeys = (
  metadataColumns: DatabaseColumnInfo[],
  rows: RowData[]
): string[] => {
  const keys = new Set<string>();
  if (metadataColumns.some((column) => column.name === '_id') || rows.some((row) => '_id' in row)) {
    keys.add('_id');
  }
  for (const column of metadataColumns) {
    if (column.name !== '_id') keys.add(column.name);
  }
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (key !== '_id') keys.add(key);
    }
  }
  return [...keys];
};
