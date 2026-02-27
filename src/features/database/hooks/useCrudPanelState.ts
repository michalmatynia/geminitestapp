'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  type DatabaseColumnInfo,
  type DatabaseTableDetail,
  type DatabaseType,
  type CrudResult,
  type CrudRequest,
} from '@/shared/contracts/database';
import type { ListQuery, MutationResult } from '@/shared/contracts/ui';
import { ApiError } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { executeSqlQuery } from '../api';
import { useDatabase } from '../context/DatabaseContext';
import { useCrudMutation } from '../hooks/useDatabaseQueries';

type CrudRowsResult = {
  rows: Record<string, unknown>[];
  totalRows: number;
};

export interface UseCrudPanelStateReturn {
  selectedTable: string;
  setSelectedTable: (table: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  mutationError: string | null;
  setMutationError: (error: string | null) => void;
  successMessage: string | null;
  setSuccessMessage: (message: string | null) => void;
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
  handleAdd: (data: Record<string, unknown>) => void;
  handleEdit: (data: Record<string, unknown>) => void;
  handleDelete: () => void;
  crudMutation: MutationResult<CrudResult, CrudRequest>;
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
  const context = useDatabase();
  const dbType = props.dbType ?? context.dbType;
  const tableDetails = props.tableDetails ?? context.tableDetails;

  const [selectedTable, setSelectedTable] = useState(props.defaultTable ?? '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [deletingRow, setDeletingRow] = useState<Record<string, unknown> | null>(null);

  const crudMutation = useCrudMutation();

  const tableDetail = useMemo(
    () => tableDetails.find((t) => t.name === selectedTable),
    [tableDetails, selectedTable]
  );

  const primaryKeyColumns = useMemo(
    () => (tableDetail?.columns ?? []).filter((c) => c.isPrimaryKey),
    [tableDetail]
  );

  useEffect(() => {
    if (props.defaultTable && props.defaultTable !== selectedTable) {
      setSelectedTable(props.defaultTable);
      setPage(1);
      setMutationError(null);
      setSuccessMessage(null);
    }
  }, [props.defaultTable, selectedTable]);

  const rowsQuery = createListQueryV2<CrudRowsResult, CrudRowsResult>({
    queryKey: dbKeys.crudRows({ dbType, selectedTable, page, pageSize }),
    enabled: Boolean(selectedTable),
    queryFn: async () => {
      if (!selectedTable) return { rows: [], totalRows: 0 };

      const offset = (page - 1) * pageSize;

      if (dbType === 'postgresql') {
        const rowsResult = await executeSqlQuery({
          sql: `SELECT * FROM "${selectedTable}" LIMIT ${pageSize} OFFSET ${offset}`,
          type: 'postgresql',
        });

        if (rowsResult.error) throw new ApiError(rowsResult.error, 400);

        let totalRows = rowsResult.rowCount ?? rowsResult.rows.length;
        try {
          const countResult = await executeSqlQuery({
            sql: `SELECT COUNT(*)::bigint AS total FROM "${selectedTable}"`,
            type: 'postgresql',
          });
          if (!countResult.error) {
            const firstRow = countResult.rows[0];
            totalRows = Number(firstRow?.['total'] ?? totalRows);
          }
        } catch (error) {
          logClientError(error, { context: { source: 'useCrudPanelState', action: 'fetchCount', table: selectedTable } });
        }

        return { rows: rowsResult.rows, totalRows };
      }

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
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'database.hooks.useCrudPanelState.rows',
      operation: 'list',
      resource: 'database.crud-rows',
      domain: 'global',
      tags: ['database', 'crud', dbType],
    },
  });

  const fetchRows = useCallback(() => {
    if (!selectedTable) return;
    setMutationError(null);
    setSuccessMessage(null);
    void queryClient.invalidateQueries({
      queryKey: dbKeys.crudRows({ dbType, selectedTable, page, pageSize }),
    });
  }, [dbKeys, dbType, page, pageSize, queryClient, selectedTable]);

  const getPrimaryKey = (row: Record<string, unknown>) => {
    const pk: Record<string, unknown> = {};
    if (dbType === 'mongodb') {
      pk['_id'] = row['_id'];
    } else {
      for (const col of primaryKeyColumns) {
        pk[col.name] = row[col.name];
      }
      if (Object.keys(pk).length === 0) return { ...row };
    }
    return pk;
  };

  const handleAdd = (data: Record<string, unknown>) => {
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      { collection: selectedTable, operation: 'create', provider: dbType, data },
      {
        onSuccess: (result) => {
  
          if (result.error) setMutationError(result.error);
          else {
            setShowAddModal(false);
            setSuccessMessage('Record created successfully');
            void rowsQuery.refetch();
          }
        },
        onError: (err) => {
          logClientError(err, { context: { source: 'useCrudPanelState', action: 'insertRow', table: selectedTable } });
          setMutationError(err.message);
        },
      }
    );
  };

  const handleEdit = (data: Record<string, unknown>) => {
    if (!editingRow) return;
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      {
        collection: selectedTable,
        operation: 'update',
        provider: dbType,
        data,
        filter: getPrimaryKey(editingRow),
        
      },
      {
        onSuccess: (result) => {
          if (result.error) setMutationError(result.error);
          else {
            setEditingRow(null);
            setSuccessMessage('Record updated successfully');
            void rowsQuery.refetch();
          }
        },
        onError: (err) => {
          logClientError(err, { context: { source: 'useCrudPanelState', action: 'updateRow', table: selectedTable } });
          setMutationError(err.message);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingRow) return;
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      {
        collection: selectedTable,
        operation: 'delete',
        provider: dbType,
        filter: getPrimaryKey(deletingRow),
        
      },
      {
        onSuccess: (result) => {
          if (result.error) setMutationError(result.error);
          else {
            setDeletingRow(null);
            setSuccessMessage('Record deleted successfully');
            void rowsQuery.refetch();
          }
        },
        onError: (err) => {
          logClientError(err, { context: { source: 'useCrudPanelState', action: 'deleteRow', table: selectedTable } });
          setMutationError(err.message);
        },
      }
    );
  };
  return {
    selectedTable, setSelectedTable,
    page, setPage,
    pageSize, setPageSize,
    mutationError, setMutationError,
    successMessage, setSuccessMessage,
    showAddModal, setShowAddModal,
    editingRow, setEditingRow,
    deletingRow, setDeletingRow,
    tableDetail,
    rows: rowsQuery.data?.rows ?? [],
    totalRows: rowsQuery.data?.totalRows ?? 0,
    isLoadingRows: rowsQuery.isLoading,
    maxPage: Math.max(1, Math.ceil((rowsQuery.data?.totalRows ?? 0) / pageSize)),
    fetchRows,
    handleAdd,
    handleEdit,
    handleDelete,
    crudMutation,
    dbType,
    tableDetails,
    columns: tableDetail?.columns ?? [],
    rowsQuery,
  };
}
