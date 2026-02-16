'use client';

import {
  EditIcon,
  PlusIcon,
  Trash2Icon,
  RefreshCwIcon
} from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';

import {
  Button,
  Input,
  Pagination,
  DataTable,
  FormModal,
  SelectSimple,
  FormField,
  StatusBadge,
  Alert,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useCrudPanelState } from '../hooks/useCrudPanelState';

import type { DatabaseColumnInfo, DatabaseTableDetail, DatabaseType } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function parseInputValue(value: string, type: string): unknown {
  if (value === '' || value === '∅') return null;
  const lowerType = type.toLowerCase();
  if (lowerType.includes('int') || lowerType === 'numeric' || lowerType === 'decimal' || lowerType === 'float' || lowerType === 'double') {
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  if (lowerType === 'boolean' || lowerType === 'bool') {
    return value === 'true' || value === '1';
  }
  if (lowerType === 'json' || lowerType === 'jsonb') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

function RowFormModal({
  columns,
  initialData,
  mode,
  onSubmit,
  onClose,
  isPending,
}: {
  columns: DatabaseColumnInfo[];
  initialData?: Record<string, unknown>;
  mode: 'add' | 'edit';
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}): React.JSX.Element {
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
                <StatusBadge
                  status='PK'
                  variant='info'
                  size='sm'
                  className='font-bold mb-1'
                />
              )}
              <Input
                value={formData[col.name] ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [col.name]: e.target.value }))
                }
                placeholder={col.defaultValue ?? (col.nullable ? 'NULL' : 'required')}
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
    selectedTable, setSelectedTable,
    page, setPage,
    pageSize, setPageSize,
    mutationError, setMutationError,
    successMessage, setSuccessMessage,
    showAddModal, setShowAddModal,
    editingRow, setEditingRow,
    deletingRow, setDeletingRow,
    tableDetail,
    rows,
    totalRows,
    isLoadingRows,
    maxPage,
    fetchRows,
    handleAdd,
    handleEdit,
    handleDelete,
    crudMutation,
    tableDetails,
    columns,
    rowsQuery,
  } = useCrudPanelState(props);

  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!columns.length && rows.length === 0) return [];
    
    const actionCol: ColumnDef<Record<string, unknown>> = {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={() => setEditingRow(row.original)}
            className='rounded p-1 text-gray-400 hover:bg-white/10 hover:text-blue-300 transition-colors'
            title='Edit row'
          >
            <EditIcon className='size-3.5' />
          </button>
          <button
            type='button'
            onClick={() => setDeletingRow(row.original)}
            className='rounded p-1 text-gray-400 hover:bg-white/10 hover:text-rose-300 transition-colors'
            title='Delete row'
          >
            <Trash2Icon className='size-3.5' />
          </button>
        </div>
      ),
      size: 80,
    };

    const dataCols = (rows.length > 0 ? Object.keys(rows[0] ?? {}) : columns.map(c => c.name)).map((key) => ({
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

  const errorMessage = mutationError ?? (rowsQuery.isError ? rowsQuery.error.message : null);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-3 bg-card/30 p-3 rounded-lg border border-border/60'>
        <SelectSimple 
          size='sm'
          value={selectedTable}
          onValueChange={(v) => {
            setSelectedTable(v);
            setPage(1);
            setMutationError(null);
            setSuccessMessage(null);
          }}
          options={tableDetails.map((t) => ({
            value: t.name,
            label: `${t.name} (~${t.rowEstimate} rows)`,
          }))}
          placeholder='Select a table to manage...'
          triggerClassName='h-8 min-w-[240px] text-xs'
        />

        {selectedTable && (
          <>
            <div className='h-4 w-px bg-border/60 mx-1' />
            <Button
              variant='outline'
              size='xs'
              onClick={fetchRows}
              disabled={rowsQuery.isFetching}
              className='h-8'
            >
              <RefreshCwIcon className={`size-3.5 mr-2 ${rowsQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size='xs'
              onClick={() => setShowAddModal(true)}
              className='h-8'
            >
              <PlusIcon className='size-3.5 mr-2' />
              Add Row
            </Button>
          </>
        )}
      </div>

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

      {selectedTable && (
        <div className='rounded-lg border border-border/60 bg-card/40 overflow-hidden'>
          <DataTable
            columns={columnDefs}
            data={rows}
            isLoading={isLoadingRows}
            maxHeight='50vh'
            stickyHeader
          />

          {!isLoadingRows && rows.length > 0 && (
            <div className='flex items-center justify-between border-t border-border px-4 py-2 bg-card/20'>
              <span className='text-xs text-gray-500 font-mono'>
                {totalRows.toLocaleString()} total rows
              </span>
              <Pagination
                page={page}
                totalPages={maxPage}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={(size) => {
                  setPage(1);
                  setPageSize(size);
                }}
                pageSizeOptions={[10, 20, 50, 100]}
                showPageSize
                variant='compact'
              />
            </div>
          )}
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
  );
}
