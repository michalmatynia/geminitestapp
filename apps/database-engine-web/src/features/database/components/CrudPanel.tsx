'use client';

import React, { useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  CrudPanelProvider,
} from '../context/CrudPanelContext';
import { useDatabaseConfig, useDatabaseData } from '../context/DatabaseContext';
import { useCrudPanelState } from '../hooks/useCrudPanelState';
import { DatabaseTreePanel } from './crud/DatabaseTreePanel';
import {
  buildDatabaseLabel,
  createActionColumn,
  createDataColumns,
  getVisibleColumnKeys,
  mergeColumnInfoWithRows,
  type RowData,
} from './CrudPanel.utils';
import { DataTable, CrudPanelModals } from './CrudPanel.primitives';

export interface CrudPanelProps {
  tableDetails?: import('@/shared/contracts/database').DatabaseTableDetail[];
  defaultTable?: string;
  dbType?: import('@/shared/contracts/database').DatabaseType;
}

export function CrudPanel(props: CrudPanelProps): React.JSX.Element {
  const { application, source } = useDatabaseConfig();
  const { databaseSize } = useDatabaseData();
  const {
    selectedTable, setSelectedTable, page, setPage, pageSize, setPageSize,
    mutationError, setMutationError, successMessage, setSuccessMessage,
    showAddModal, setShowAddModal, editingRow, setEditingRow, deletingRow, setDeletingRow,
    tableDetail, rows, totalRows, isLoadingRows, fetchRows, handleAdd, handleEdit, handleDelete,
    crudMutation, tableDetails, columns, rowsQuery,
  } = useCrudPanelState(props);

  const queryErrorMessage =
    rowsQuery.isError && rowsQuery.error instanceof Error ? rowsQuery.error.message : null;
  const errorMessage = mutationError ?? queryErrorMessage;
  const databaseLabel = useMemo(() => buildDatabaseLabel(application, source), [application, source]);

  const handleSelectTable = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setPage(1);
    setMutationError(null);
    setSuccessMessage(null);
  }, [setMutationError, setPage, setSelectedTable, setSuccessMessage]);

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

  const stateValue = { selectedTable, tableDetails, isFetching: rowsQuery.isFetching };
  const actionsValue = {
    setSelectedTable, onRefresh: fetchRows, onAddRow: () => setShowAddModal(true),
    setPage, setPageSize, setMutationError, setSuccessMessage,
  };

  return (
    <CrudPanelProvider stateValue={stateValue} actionsValue={actionsValue}>
      <div className='space-y-4'>
        <div className='grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]'>
          <DatabaseTreePanel
            databaseLabel={databaseLabel} databaseSize={databaseSize}
            isFetching={rowsQuery.isFetching} onSelectTable={handleSelectTable}
            selectedTable={selectedTable} tableDetails={tableDetails}
          />
          <DataTable
            columnDefs={columnDefs} rows={rows} isLoadingRows={isLoadingRows}
            errorMessage={errorMessage} successMessage={successMessage}
            page={page} pageSize={pageSize} totalRows={totalRows}
          />
        </div>
        <CrudPanelModals
          showAddModal={showAddModal} tableDetail={tableDetail} modalColumns={modalColumns}
          handleAdd={handleAdd} setShowAddModal={setShowAddModal} editingRow={editingRow}
          handleEdit={handleEdit} setEditingRow={setEditingRow} deletingRow={deletingRow}
          setDeletingRow={setDeletingRow} handleDelete={handleDelete} isPending={crudMutation.isPending}
        />
      </div>
    </CrudPanelProvider>
  );
}
