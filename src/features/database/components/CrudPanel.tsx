'use client';

import { EditIcon, Trash2Icon } from 'lucide-react';
import React, { useMemo } from 'react';
import type { DatabaseType } from '@/shared/contracts/database';
import { Button, Card } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { CompactEmptyState, Pagination } from '@/shared/ui/navigation-and-layout.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { CrudPanelProvider } from '../context/CrudPanelContext';
import { useCrudPanelState } from '../hooks/useCrudPanelState';
import { DatabaseTableSelector } from './crud/DatabaseTableSelector';
import { RowFormModal } from './crud/RowFormModal';
import { formatDatabaseCellValue } from './format-cell-value';
import type { ColumnDef } from '@tanstack/react-table';

export function CrudPanel(props: {
  tableDetails?: any;
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
  } = useCrudPanelState(props);

  const errorMessage = mutationError ?? (rowsQuery.isError && rowsQuery.error instanceof Error ? rowsQuery.error.message : null);

  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (columns.length === 0 && rows.length === 0) return [];
    
    const actionCol: ColumnDef<Record<string, unknown>> = {
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
    };

    const keys = rows.length > 0 ? Object.keys(rows[0] ?? {}) : columns.map((c: any) => c.name);
    const dataCols = keys.map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ row }: any) => (
        <span className='font-mono text-xs text-gray-300 truncate block max-w-[200px]' title={formatDatabaseCellValue(row.original[key])}>
          {formatDatabaseCellValue(row.original[key])}
        </span>
      ),
    }));

    return [actionCol, ...dataCols];
  }, [columns, rows, setEditingRow, setDeletingRow]);

  return (
    <CrudPanelProvider 
        stateValue={{ selectedTable, tableDetails, isFetching: rowsQuery.isFetching }} 
        actionsValue={{ setSelectedTable, onRefresh: fetchRows, onAddRow: () => setShowAddModal(true), setPage, setMutationError, setSuccessMessage }}
    >
      <div className='space-y-4'>
        {selectedTable !== '' ? (
          <StandardDataTablePanel
            columns={columnDefs}
            data={rows}
            isLoading={isLoadingRows}
            maxHeight='50vh'
            stickyHeader
            alerts={<>{errorMessage && <div className='px-3 py-2 text-xs bg-red-500/10 text-red-500'>{errorMessage}</div>}{successMessage && <div className='px-3 py-2 text-xs bg-emerald-500/10 text-emerald-500'>{successMessage}</div>}</>}
            filters={<DatabaseTableSelector />}
            footer={selectedTable && !isLoadingRows && rows.length > 0 ? (
                <div className='px-4 pb-2'>
                  <Pagination variant='panel' page={page} pageSize={pageSize} totalCount={totalRows} onPageChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} isLoading={isLoadingRows} />
                </div>
              ) : null}
            variant='flat'
          />
        ) : (
          <div className='space-y-4'>
            <Card variant='subtle-compact' padding='sm' className='flex flex-wrap items-center gap-3 bg-card/30 border-border/60'><DatabaseTableSelector /></Card>
            <CompactEmptyState title='No table selected' description='Please select a table.' className='bg-card/40 border-dashed border-border/60 py-20' />
          </div>
        )}
        {showAddModal && tableDetail && <RowFormModal columns={tableDetail.columns} mode='add' onSubmit={handleAdd} onClose={() => setShowAddModal(false)} isPending={crudMutation.isPending} />}
        {editingRow && tableDetail && <RowFormModal columns={tableDetail.columns} initialData={editingRow} mode='edit' onSubmit={handleEdit} onClose={() => setEditingRow(null)} isPending={crudMutation.isPending} />}
        <ConfirmModal isOpen={deletingRow !== null} onClose={() => setDeletingRow(null)} onConfirm={handleDelete} title='Delete Row' message='Are you sure?' confirmText='Delete' isDangerous={true} loading={crudMutation.isPending} />
      </div>
    </CrudPanelProvider>
  );
}
