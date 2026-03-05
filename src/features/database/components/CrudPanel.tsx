'use client';

import { EditIcon, Trash2Icon } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

import type {
  DatabaseColumnInfo,
  DatabaseTableDetail,
  DatabaseType,
} from '@/shared/contracts/database';
import {
  Input,
  FormModal,
  FormField,
  StatusBadge,
  Alert,
  StandardDataTablePanel,
  Card,
  EmptyState,
  PanelPagination,
  Button,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useCrudPanelState, type UseCrudPanelStateReturn } from '../hooks/useCrudPanelState';
import {
  CrudPanelProvider,
  type CrudPanelActionsContextValue,
  type CrudPanelStateContextValue,
} from '../context/CrudPanelContext';
import { DatabaseTableSelector } from './crud/DatabaseTableSelector';

import type { ColumnDef } from '@tanstack/react-table';

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function parseInputValue(value: string, type: string): unknown {
  if (value === '' || value === '∅') return null;
  const lowerType = type.toLowerCase();
  if (
    lowerType.includes('int') ||
    lowerType === 'numeric' ||
    lowerType === 'decimal' ||
    lowerType === 'float' ||
    lowerType === 'double'
  ) {
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  if (lowerType === 'boolean' || lowerType === 'bool') {
    return value === 'true' || value === '1';
  }
  if (lowerType === 'json' || lowerType === 'jsonb') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function RowFormModal(props: {
  columns: DatabaseColumnInfo[];
  initialData?: Record<string, unknown>;
  mode: 'add' | 'edit';
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}): React.JSX.Element {
  const { columns, initialData, mode, onSubmit, onClose, isPending } = props;

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      if (initialData?.[col.name] !== undefined) {
        initial[col.name] = formatCellValue(initialData[col.name]);
      } else {
        initial[col.name] = '';
      }
    }
    return initial;
  });

  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const parsed: Record<string, unknown> = {};
    for (const col of columns) {
      const val = formData[col.name] ?? '';
      if (mode === 'add' && col.isPrimaryKey && col.defaultValue && val === '') continue;
      parsed[col.name] = parseInputValue(val, col.type);
    }
    onSubmit(parsed);
  };

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title={mode === 'add' ? 'Add New Row' : 'Edit Row'}
      onSave={() => formRef.current?.requestSubmit()}
      isSaving={isPending}
      saveText={mode === 'add' ? 'Insert Row' : 'Update Row'}
      size='md'
    >
      <form ref={formRef} onSubmit={handleSubmit} className='space-y-4'>
        {columns.map((col) => (
          <FormField
            key={col.name}
            label={col.name}
            description={col.type}
            required={!col.nullable && !col.isPrimaryKey}
          >
            <div className='flex flex-col gap-1.5'>
              {col.isPrimaryKey && (
                <StatusBadge status='PK' variant='info' size='sm' className='font-bold mb-1' />
              )}
              <Input
                value={formData[col.name] ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                placeholder={
                  typeof col.defaultValue === 'string'
                    ? col.defaultValue
                    : col.nullable
                      ? 'NULL'
                      : 'required'
                }
                className='font-mono text-xs'
                disabled={mode === 'edit' && col.isPrimaryKey}
              />
            </div>
          </FormField>
        ))}
      </form>
    </FormModal>
  );
}

export function CrudPanel(props: {
  tableDetails?: DatabaseTableDetail[];
  defaultTable?: string;
  dbType?: DatabaseType;
}): React.JSX.Element {
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
  }: UseCrudPanelStateReturn = useCrudPanelState(props);

  const rowsError: string | null =
    rowsQuery.isError && rowsQuery.error instanceof Error ? rowsQuery.error.message : null;
  const errorMessage: string | null = mutationError ?? rowsError;

  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!columns.length && rows.length === 0) return [];

    const actionCol: ColumnDef<Record<string, unknown>> = {
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
          >
            <EditIcon className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='xs'
            onClick={() => setDeletingRow(row.original)}
            className='rounded p-1 text-gray-400 hover:bg-white/10 hover:text-rose-300'
            title='Delete row'
          >
            <Trash2Icon className='size-3.5' />
          </Button>
        </div>
      ),
      size: 80,
    };

    const dataCols = (
      rows.length > 0 ? Object.keys(rows[0] ?? {}) : columns.map((c) => c.name)
    ).map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => (
        <span
          className='font-mono text-xs text-gray-300 truncate block max-w-[200px]'
          title={formatCellValue(row.original[key])}
        >
          {formatCellValue(row.original[key])}
        </span>
      ),
    }));

    return [actionCol, ...dataCols];
  }, [columns, rows, setEditingRow, setDeletingRow]);

  const alerts = (
    <>
      {errorMessage && (
        <Alert variant='error' className='px-3 py-2 text-xs'>
          {errorMessage}
        </Alert>
      )}
      {successMessage && (
        <Alert variant='success' className='px-3 py-2 text-xs'>
          {successMessage}
        </Alert>
      )}
    </>
  );

  const filters = <DatabaseTableSelector />;

  const footer =
    selectedTable && !isLoadingRows && rows.length > 0 ? (
      <div className='px-4 pb-2'>
        <PanelPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalRows}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
          isLoading={isLoadingRows}
        />
      </div>
    ) : null;

  const stateValue: CrudPanelStateContextValue = {
    selectedTable,
    tableDetails,
    isFetching: rowsQuery.isFetching,
  };
  const actionsValue: CrudPanelActionsContextValue = {
    setSelectedTable,
    onRefresh: fetchRows,
    onAddRow: () => setShowAddModal(true),
    setPage,
    setMutationError,
    setSuccessMessage,
  };

  return (
    <CrudPanelProvider stateValue={stateValue} actionsValue={actionsValue}>
      <div className='space-y-4'>
        {selectedTable ? (
          <StandardDataTablePanel
            columns={columnDefs}
            data={rows}
            isLoading={isLoadingRows}
            maxHeight='50vh'
            stickyHeader
            alerts={alerts}
            filters={filters}
            footer={footer}
            variant='flat'
          />
        ) : (
          <div className='space-y-4'>
            <Card
              variant='subtle-compact'
              padding='sm'
              className='flex flex-wrap items-center gap-3 bg-card/30 border-border/60'
            >
              {filters}
            </Card>
            {alerts}
            <EmptyState
              title='No table selected'
              description='Please select a table from the list above to view and manage its data.'
              variant='compact'
              className='bg-card/40 border-dashed border-border/60 py-20'
            />
          </div>
        )}

        {showAddModal && tableDetail && (
          <RowFormModal
            columns={tableDetail.columns}
            mode='add'
            onSubmit={handleAdd}
            onClose={() => setShowAddModal(false)}
            isPending={crudMutation.isPending}
          />
        )}

        {editingRow && tableDetail && (
          <RowFormModal
            columns={tableDetail.columns}
            initialData={editingRow}
            mode='edit'
            onSubmit={handleEdit}
            onClose={() => setEditingRow(null)}
            isPending={crudMutation.isPending}
          />
        )}

        <ConfirmModal
          isOpen={!!deletingRow}
          onClose={() => setDeletingRow(null)}
          onConfirm={handleDelete}
          title='Delete Row'
          message='Are you sure you want to delete this row? This action cannot be undone.'
          confirmText='Delete'
          isDangerous={true}
          loading={crudMutation.isPending}
        />
      </div>
    </CrudPanelProvider>
  );
}
