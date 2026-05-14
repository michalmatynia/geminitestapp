'use client';

import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  DatabaseColumnInfo,
  DatabaseTableDetail,
} from '@/shared/contracts/database';
import { Card } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { CompactEmptyState, Pagination } from '@/shared/ui/navigation-and-layout.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import {
  useCrudPanelActionsContext,
  useCrudPanelStateContext,
} from '../context/CrudPanelContext';
import { DatabaseTableSelector } from './crud/DatabaseTableSelector';
import { RowFormModal } from './crud/RowFormModal';
import type { RowData } from './CrudPanel.utils';

export function DataTableAlerts({
  errorMessage,
  successMessage,
}: {
  errorMessage: string | null;
  successMessage: string | null;
}): React.JSX.Element {
  const hasErrorMessage = errorMessage !== null && errorMessage !== '';
  const hasSuccessMessage = successMessage !== null && successMessage !== '';
  if (!hasErrorMessage && !hasSuccessMessage) return <></>;
  return (
    <>
      {hasErrorMessage && <div className='px-3 py-2 text-xs bg-red-500/10 text-red-500'>{errorMessage}</div>}
      {hasSuccessMessage && (
        <div className='px-3 py-2 text-xs bg-emerald-500/10 text-emerald-500'>{successMessage}</div>
      )}
    </>
  );
}

export function DataTableFooter({
  page, pageSize, totalRows, isLoadingRows, showFooter, onPageChange, onPageSizeChange,
}: {
  page: number; pageSize: number; totalRows: number; isLoadingRows: boolean; showFooter: boolean;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}): React.JSX.Element | null {
  if (!showFooter) return null;
  return (
    <div className='px-4 pb-2'>
      <Pagination
        variant='panel' page={page} pageSize={pageSize} totalCount={totalRows}
        onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} isLoading={isLoadingRows}
      />
    </div>
  );
}

function DataTableEmpty(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <Card
        variant='subtle-compact' padding='sm'
        className='flex flex-wrap items-center gap-3 bg-card/30 border-border/60'
      >
        <DatabaseTableSelector />
      </Card>
      <CompactEmptyState
        title='No table selected' description='Please select a table.'
        className='bg-card/40 border-dashed border-border/60 py-20'
      />
    </div>
  );
}

export const DataTable = ({
  columnDefs, rows, isLoadingRows, errorMessage, successMessage, page, pageSize, totalRows,
}: {
  columnDefs: ColumnDef<RowData>[]; rows: RowData[]; isLoadingRows: boolean;
  errorMessage: string | null; successMessage: string | null;
  page: number; pageSize: number; totalRows: number;
}): React.JSX.Element => {
  const { selectedTable } = useCrudPanelStateContext();
  const { setPage, setPageSize } = useCrudPanelActionsContext();
  if (selectedTable === '') return <DataTableEmpty />;
  const hasFooter = !isLoadingRows && rows.length > 0;
  const handlePageSizeChange = (size: number): void => {
    setPage(1);
    setPageSize(size);
  };
  return (
    <StandardDataTablePanel
      columns={columnDefs} data={rows} isLoading={isLoadingRows} maxHeight='50vh' stickyHeader
      alerts={<DataTableAlerts errorMessage={errorMessage} successMessage={successMessage} />}
      filters={<DatabaseTableSelector />}
      footer={
        <DataTableFooter
          page={page} pageSize={pageSize} totalRows={totalRows} isLoadingRows={isLoadingRows}
          showFooter={hasFooter} onPageChange={setPage} onPageSizeChange={handlePageSizeChange}
        />
      }
      variant='flat'
    />
  );
};

export function CrudPanelModals({
  showAddModal, tableDetail, modalColumns, handleAdd, setShowAddModal,
  editingRow, handleEdit, setEditingRow, deletingRow, setDeletingRow, handleDelete, isPending,
}: {
  showAddModal: boolean; tableDetail: DatabaseTableDetail | null; modalColumns: DatabaseColumnInfo[];
  handleAdd: (data: Record<string, unknown>) => void;
  setShowAddModal: (value: boolean) => void; editingRow: RowData | null;
  handleEdit: (data: Record<string, unknown>) => void;
  setEditingRow: (row: RowData | null) => void; deletingRow: RowData | null;
  setDeletingRow: (row: RowData | null) => void; handleDelete: () => void;
  isPending: boolean;
}): React.JSX.Element {
  return (
    <>
      {showAddModal && tableDetail !== null && (
        <RowFormModal
          columns={modalColumns} mode='add' onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)} isPending={isPending}
        />
      )}
      {editingRow && tableDetail !== null && (
        <RowFormModal
          columns={modalColumns} initialData={editingRow} mode='edit'
          onSubmit={handleEdit} onClose={() => setEditingRow(null)} isPending={isPending}
        />
      )}
      <ConfirmModal
        isOpen={deletingRow !== null} onClose={() => setDeletingRow(null)}
        onConfirm={handleDelete} title='Delete Row'
        message='Are you sure?' confirmText='Delete' isDangerous={true} loading={isPending}
      />
    </>
  );
}
