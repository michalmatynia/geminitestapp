'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DatabaseColumnInfo, DatabaseTableDetail, DatabaseType } from '@/shared/contracts/database';
import type { ListQuery } from '@/shared/contracts/ui/queries';
import { ApiError } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { executeSqlQuery } from '../api';
import { useDatabaseConfig, useDatabaseData } from '../context/DatabaseContext';
import { useCrudMutations, type UseCrudMutationsReturn } from './crud/useCrudMutations';

type CrudRowsResult = {
  rows: Record<string, unknown>[];
  totalRows: number;
};

export interface UseCrudPanelStateReturn extends UseCrudMutationsReturn {
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  showAddModal: boolean;
  setShowAddModal: (show: boolean) => void;
  editingRow: Record<string, unknown> | null;
  setEditingRow: (row: Record<string, unknown> | null) => void;
  deletingRow: Record<string, unknown> | null;
  setDeletingRow: (row: Record<string, unknown> | null) => void;
  tableDetail: DatabaseTableDetail | undefined;
  rows: Record<string, unknown>[];
  totalRows: number;
  isLoadingRows: boolean;
  maxPage: number;
  fetchRows: () => void;
  dbType: DatabaseType;
  tableDetails: DatabaseTableDetail[];
  columns: DatabaseColumnInfo[];
  rowsQuery: ListQuery<CrudRowsResult, CrudRowsResult>;
}

export function useCrudPanelState(props: {
  tableDetails?: DatabaseTableDetail[];
  defaultTable?: string;
  dbType?: DatabaseType;
}): UseCrudPanelStateReturn {
  const dbKeys = QUERY_KEYS.system.databases;
  const { dbType: contextDbType } = useDatabaseConfig();
  const { tableDetails: contextTableDetails } = useDatabaseData();
  const dbType = props.dbType ?? contextDbType;
  const tableDetails = props.tableDetails ?? contextTableDetails;

  const [selectedTable, setSelectedTable] = useState(props.defaultTable ?? '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [deletingRow, setDeletingRow] = useState<Record<string, unknown> | null>(null);

  const mutations = useCrudMutations();

  const tableDetail = useMemo(
    () => tableDetails.find((t) => t.name === selectedTable),
    [tableDetails, selectedTable]
  );

  const rowsQuery = createListQueryV2<CrudRowsResult, CrudRowsResult>({
    queryKey: dbKeys.crudRows({ dbType, selectedTable, page, pageSize }),
    enabled: selectedTable !== '',
    queryFn: async () => {
      if (selectedTable === '') return { rows: [], totalRows: 0 };
      if (dbType !== 'mongodb') throw new ApiError('Only MongoDB CRUD operations are supported.', 400);

      const mongoResult = await executeSqlQuery({
        type: 'mongodb',
        collection: selectedTable,
        operation: 'find',
        filter: {},
      });

      if (mongoResult.error) throw new ApiError(mongoResult.error, 400);

      return {
        rows: mongoResult.rows,
        totalRows: mongoResult.rowCount ?? mongoResult.rows.length,
      };
    },
  });

  const fetchRows = useCallback(() => {
    if (selectedTable === '') return;
    mutations.setMutationError(null);
    mutations.setSuccessMessage(null);
    void rowsQuery.refetch();
  }, [rowsQuery, selectedTable, mutations]);

  const handleAdd = (data: Record<string, unknown>) => {
    mutations.handleAdd(selectedTable, data, () => {
      setShowAddModal(false);
      void rowsQuery.refetch();
    });
  };

  const handleEdit = (data: Record<string, unknown>) => {
    if (!editingRow) return;
    mutations.handleEdit(selectedTable, editingRow, data, () => {
      setEditingRow(null);
      void rowsQuery.refetch();
    });
  };

  const handleDelete = () => {
    if (!deletingRow) return;
    mutations.handleDelete(selectedTable, deletingRow, () => {
      setDeletingRow(null);
      void rowsQuery.refetch();
    });
  };

  return {
    ...mutations,
    selectedTable,
    setSelectedTable,
    page,
    setPage,
    pageSize,
    setPageSize,
    showAddModal,
    setShowAddModal,
    editingRow,
    setEditingRow,
    deletingRow,
    setDeletingRow,
    tableDetail,
    rows: rowsQuery.data?.rows ?? [],
    totalRows: rowsQuery.data?.totalRows ?? 0,
    isLoadingRows: rowsQuery.isLoading,
    maxPage: Math.ceil((rowsQuery.data?.totalRows ?? 0) / pageSize),
    fetchRows,
    handleAdd,
    handleEdit,
    handleDelete,
    dbType,
    tableDetails,
    columns: tableDetail?.columns ?? [],
    rowsQuery,
  };
}
