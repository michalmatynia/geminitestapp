'use client';

import { EditIcon, Trash2Icon } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import type {
  DatabaseColumnInfo,
  DatabaseEngineManagedMongoApplication,
  DatabaseTableDetail,
  DatabaseType,
  MongoSource,
} from '@/shared/contracts/database';
import { Button, Card } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { CompactEmptyState, Pagination } from '@/shared/ui/navigation-and-layout.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import {
  CrudPanelProvider,
  useCrudPanelActionsContext,
  useCrudPanelStateContext,
} from '../context/CrudPanelContext';
import { useDatabaseConfig, useDatabaseData } from '../context/DatabaseContext';
import { useCrudPanelState } from '../hooks/useCrudPanelState';
import { DatabaseTableSelector } from './crud/DatabaseTableSelector';
import { DatabaseTreePanel } from './crud/DatabaseTreePanel';
import { RowFormModal } from './crud/RowFormModal';
import { formatDatabaseCellValue } from './format-cell-value';
import type { ColumnDef } from '@tanstack/react-table';

export interface CrudPanelProps {
  tableDetails?: DatabaseTableDetail[];
  defaultTable?: string;
  dbType?: DatabaseType;
}

interface RowData extends Record<string, unknown> {}

const MANAGED_APPLICATION_LABELS: Record<DatabaseEngineManagedMongoApplication, string> = {
  geminitestapp: 'GeminiTest App',
  studiq: 'StudiQ',
  'cms-builder': 'CMS Builder',
  products: 'Products',
};

const SOURCE_LABELS: Record<MongoSource, string> = {
  local: 'Local',
  cloud: 'Cloud',
};

const buildDatabaseLabel = (
  application: DatabaseEngineManagedMongoApplication | undefined,
  source: MongoSource | undefined
): string => {
  if (application === undefined) return 'Current MongoDB';
  return `${MANAGED_APPLICATION_LABELS[application]} / ${SOURCE_LABELS[source ?? 'local']}`;
};

const createActionColumn = (
  setEditingRow: (row: RowData) => void,
  setDeletingRow: (row: RowData) => void
): ColumnDef<RowData> => ({
  id: 'actions',
  header: 'Actions',
  cell: ({ row }) => (
    <div className='flex items-center gap-1'>
      <Button variant='ghost' size='xs' onClick={() => setEditingRow(row.original)} className='rounded p-1 text-gray-400 hover:bg-white/10 hover:text-blue-300' title='Edit row' aria-label='Edit row'>
        <EditIcon className='size-3.5' />
      </Button>
      <Button variant='ghost' size='xs' onClick={() => setDeletingRow(row.original)} className='rounded p-1 text-gray-400 hover:bg-white/10 hover:text-rose-300' title='Delete row' aria-label='Delete row'>
        <Trash2Icon className='size-3.5' />
      </Button>
    </div>
  ),
  size: 80,
});

const createDataColumns = (keys: string[]): ColumnDef<RowData>[] => {
  return keys.map((key) => ({
    accessorKey: key,
    header: key,
    cell: ({ row }) => (
      <span className='font-mono text-xs text-gray-300 truncate block max-w-[200px]' title={formatDatabaseCellValue(row.original[key])}>
        {formatDatabaseCellValue(row.original[key])}
      </span>
    ),
  }));
};

const inferColumnType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as { constructor?: { name?: string } }).constructor?.name === 'ObjectId'
  ) {
    return 'ObjectId';
  }
  return typeof value;
};

const createFallbackColumnInfo = (name: string, value: unknown): DatabaseColumnInfo => ({
  name,
  type: inferColumnType(value),
  nullable: value === null,
  defaultValue: null,
  isPrimaryKey: name === '_id',
  isForeignKey: false,
});

const mergeColumnInfoWithRows = (
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

const getVisibleColumnKeys = (
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

const DataTable = ({
  columnDefs,
  rows,
  isLoadingRows,
  errorMessage,
  successMessage,
  page,
  pageSize,
  totalRows,
}: {
  columnDefs: ColumnDef<RowData>[];
  rows: RowData[];
  isLoadingRows: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  page: number;
  pageSize: number;
  totalRows: number;
}): React.JSX.Element => {
  const { selectedTable } = useCrudPanelStateContext();
  const { setPage, setPageSize } = useCrudPanelActionsContext();

  if (selectedTable === '') {
    return (
      <div className='space-y-4'>
        <Card variant='subtle-compact' padding='sm' className='flex flex-wrap items-center gap-3 bg-card/30 border-border/60'><DatabaseTableSelector /></Card>
        <CompactEmptyState title='No table selected' description='Please select a table.' className='bg-card/40 border-dashed border-border/60 py-20' />
      </div>
    );
  }

  return (
    <StandardDataTablePanel
      columns={columnDefs}
      data={rows}
      isLoading={isLoadingRows}
      maxHeight='50vh'
      stickyHeader
      alerts={
        <>
          {errorMessage !== null && errorMessage !== '' && <div className='px-3 py-2 text-xs bg-red-500/10 text-red-500'>{errorMessage}</div>}
          {successMessage !== null && successMessage !== '' && <div className='px-3 py-2 text-xs bg-emerald-500/10 text-emerald-500'>{successMessage}</div>}
        </>
      }
      filters={<DatabaseTableSelector />}
      footer={
        selectedTable !== '' && !isLoadingRows && rows.length > 0 ? (
          <div className='px-4 pb-2'>
            <Pagination variant='panel' page={page} pageSize={pageSize} totalCount={totalRows} onPageChange={setPage} onPageSizeChange={(size: number) => { setPage(1); setPageSize(size); }} isLoading={isLoadingRows} />
          </div>
        ) : null
      }
      variant='flat'
    />
  );
};

export function CrudPanel(props: CrudPanelProps): React.JSX.Element {
  const { application, source } = useDatabaseConfig();
  const { databaseSize } = useDatabaseData();
  const {
    selectedTable,
    setSelectedTable,
    page,
    setPage,
    pageSize,
    setPageSize,
    mutationError,
    setMutationError,
    successMessage,
    setSuccessMessage,
    showAddModal,
    setShowAddModal,
    editingRow,
    setEditingRow,
    deletingRow,
    setDeletingRow,
    tableDetail,
    rows,
    totalRows,
    isLoadingRows,
    fetchRows,
    handleAdd,
    handleEdit,
    handleDelete,
    crudMutation,
    tableDetails,
    columns,
    rowsQuery,
  } = useCrudPanelState(props);

  const errorMessage = mutationError ?? (rowsQuery.isError && rowsQuery.error instanceof Error ? rowsQuery.error.message : null);
  const databaseLabel = useMemo(
    () => buildDatabaseLabel(application, source),
    [application, source]
  );

  const handleSelectTable = useCallback(
    (tableName: string) => {
      setSelectedTable(tableName);
      setPage(1);
      setMutationError(null);
      setSuccessMessage(null);
    },
    [setMutationError, setPage, setSelectedTable, setSuccessMessage]
  );

  const columnDefs = useMemo<ColumnDef<RowData>[]>(() => {
    if (columns.length === 0 && rows.length === 0) return [];
    
    const actionCol = createActionColumn(setEditingRow, setDeletingRow);
    const keys = getVisibleColumnKeys(columns, rows);
    const dataCols = createDataColumns(keys);

    return [actionCol, ...dataCols];
  }, [columns, rows, setEditingRow, setDeletingRow]);
  const modalColumns = useMemo(
    () => mergeColumnInfoWithRows(tableDetail?.columns ?? [], rows),
    [rows, tableDetail?.columns]
  );

  return (
    <CrudPanelProvider 
        stateValue={{ selectedTable, tableDetails, isFetching: rowsQuery.isFetching }} 
        actionsValue={{ setSelectedTable, onRefresh: fetchRows, onAddRow: () => setShowAddModal(true), setPage, setPageSize, setMutationError, setSuccessMessage }}
    >
      <div className='space-y-4'>
        <div className='grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]'>
          <DatabaseTreePanel
            databaseLabel={databaseLabel}
            databaseSize={databaseSize}
            isFetching={rowsQuery.isFetching}
            onSelectTable={handleSelectTable}
            selectedTable={selectedTable}
            tableDetails={tableDetails}
          />
          <DataTable
            columnDefs={columnDefs}
            rows={rows}
            isLoadingRows={isLoadingRows}
            errorMessage={errorMessage}
            successMessage={successMessage}
            page={page}
            pageSize={pageSize}
            totalRows={totalRows}
          />
        </div>
        {showAddModal && tableDetail && <RowFormModal columns={modalColumns} mode='add' onSubmit={handleAdd} onClose={() => setShowAddModal(false)} isPending={crudMutation.isPending} />}
        {editingRow && tableDetail && <RowFormModal columns={modalColumns} initialData={editingRow} mode='edit' onSubmit={handleEdit} onClose={() => setEditingRow(null)} isPending={crudMutation.isPending} />}
        <ConfirmModal isOpen={deletingRow !== null} onClose={() => setDeletingRow(null)} onConfirm={handleDelete} title='Delete Row' message='Are you sure?' confirmText='Delete' isDangerous={true} loading={crudMutation.isPending} />
      </div>
    </CrudPanelProvider>
  );
}
