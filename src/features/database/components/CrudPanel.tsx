'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EditIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { logClientError } from '@/features/observability';
import { ApiError } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  Badge,
  Button,
  Input,
  Pagination,
  
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  FormModal,
  ConfirmDialog,
  RefreshButton,
  SelectSimple,
  FormField,
} from '@/shared/ui';

import { executeSqlQuery } from '../api';
import { useDatabase } from '../context/DatabaseContext';
import { useCrudMutation } from '../hooks/useDatabaseQueries';

import type {
  CrudOperation,
  DatabaseColumnInfo,
  DatabaseTableDetail,
  DatabaseType,
} from '../types';

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

/* ─── Row Form Modal ─── */

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
      // Skip auto-generated PK columns on insert
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
        {columns.map((col: DatabaseColumnInfo) => (
          <FormField
            key={col.name}
            label={col.name}
            description={col.type}
            required={!col.nullable && !col.isPrimaryKey}
          >
            <div className='flex flex-col gap-1.5'>
              {col.isPrimaryKey && (
                <div className='flex items-center gap-2'>
                  <Badge variant='default' className='text-[9px]'>PK</Badge>
                </div>
              )}
              <Input
                value={formData[col.name] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: Record<string, string>) => ({ ...prev, [col.name]: e.target.value }))
                }
                placeholder={col.defaultValue ?? (col.nullable ? 'NULL' : 'required')}
                className='h-8 font-mono text-xs'
                disabled={mode === 'edit' && col.isPrimaryKey}
              />
            </div>
          </FormField>
        ))}
      </form>
    </FormModal>
  );
}

/* ─── Main CRUD Panel ─── */

export function CrudPanel({
  tableDetails: tableDetailsProp,
  defaultTable,
  dbType: dbTypeProp,
}: {
  tableDetails?: DatabaseTableDetail[];
  defaultTable?: string;
  dbType?: DatabaseType;
}): React.JSX.Element {
  const dbKeys = QUERY_KEYS.system.databases;
  const context = useDatabase();
  const dbType = dbTypeProp ?? context.dbType;
  const tableDetails = tableDetailsProp ?? context.tableDetails;

  const [selectedTable, setSelectedTable] = useState(defaultTable ?? '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Sync when parent changes the default table (e.g. clicking "Manage" on a different table)
  useEffect(() => {
    if (defaultTable && defaultTable !== selectedTable) {
      setSelectedTable(defaultTable);
      setPage(1);
      setMutationError(null);
      setSuccessMessage(null);
    }
  }, [defaultTable, selectedTable]);  

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [deletingRow, setDeletingRow] = useState<Record<string, unknown> | null>(null);

  const crudMutation = useCrudMutation();

  const tableDetail = useMemo(
    () => tableDetails.find((t: DatabaseTableDetail) => t.name === selectedTable),
    [tableDetails, selectedTable]
  );

  const primaryKeyColumns = useMemo(
    () => (tableDetail?.columns ?? []).filter((c: DatabaseColumnInfo) => c.isPrimaryKey),
    [tableDetail]
  );

  const rowsQuery = useQuery({
    queryKey: dbKeys.crudRows({ dbType, selectedTable, page, pageSize }),
    enabled: Boolean(selectedTable),
    queryFn: async (): Promise<{ rows: Record<string, unknown>[]; totalRows: number }> => {
      if (!selectedTable) {
        return { rows: [], totalRows: 0 };
      }

      const offset = (page - 1) * pageSize;

      if (dbType === 'postgresql') {
        const rowsResult = await executeSqlQuery({
          sql: `SELECT * FROM "${selectedTable}" LIMIT ${pageSize} OFFSET ${offset}`,
          type: 'postgresql',
        });

        if (rowsResult.error) {
          throw new ApiError(rowsResult.error, 400);
        }

        let totalRows = rowsResult.rowCount ?? rowsResult.rows.length;
        try {
          const countResult = await executeSqlQuery({
            sql: `SELECT COUNT(*)::bigint AS total FROM "${selectedTable}"`,
            type: 'postgresql',
          });
          if (!countResult.error) {
            totalRows = Number(
              (countResult.rows[0] as Record<string, unknown>)?.['total'] ?? totalRows
            );
          }
        } catch (error: unknown) {
          logClientError(error, {
            context: { source: 'CrudPanel', action: 'fetchCount', table: selectedTable },
          });
        }

        return { rows: rowsResult.rows, totalRows };
      }

      const mongoResult = await executeSqlQuery({
        type: 'mongodb',
        collection: selectedTable,
        operation: 'find',
        filter: {},
      });

      if (mongoResult.error) {
        throw new ApiError(mongoResult.error, 400);
      }

      return {
        rows: mongoResult.rows,
        totalRows: mongoResult.rowCount ?? mongoResult.rows.length,
      };
    },
  });

  const fetchRows = useCallback((): void => {
    if (!selectedTable) return;
    setMutationError(null);
    setSuccessMessage(null);
    void queryClient.invalidateQueries({
      queryKey: dbKeys.crudRows({ dbType, selectedTable, page, pageSize }),
    });
  }, [dbKeys, dbType, page, pageSize, queryClient, selectedTable]);

  const getPrimaryKey = (row: Record<string, unknown>): Record<string, unknown> => {
    const pk: Record<string, unknown> = {};
    if (dbType === 'mongodb') {
      pk['_id'] = row['_id'];
    } else {
      for (const col of primaryKeyColumns) {
        pk[col.name] = row[col.name];
      }
      // Fallback: use all columns if no PK
      if (Object.keys(pk).length === 0) {
        return { ...row };
      }
    }
    return pk;
  };

  const handleAdd = (data: Record<string, unknown>): void => {
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      { table: selectedTable, operation: 'insert' as CrudOperation, type: dbType, data },
      {
        onSuccess: (result) => {
          if (result.error) {
            setMutationError(result.error);
          } else {
            setShowAddModal(false);
            setSuccessMessage(`Inserted ${result.rowCount} row(s)`);
            void rowsQuery.refetch();
          }
        },
        onError: (err: Error) => {
          logClientError(err, { context: { source: 'CrudPanel', action: 'insertRow', table: selectedTable } });
          setMutationError(err.message);
        },
      }
    );
  };

  const handleEdit = (data: Record<string, unknown>): void => {
    if (!editingRow) return;
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      {
        table: selectedTable,
        operation: 'update' as CrudOperation,
        type: dbType,
        data,
        primaryKey: getPrimaryKey(editingRow),
      },
      {
        onSuccess: (result) => {
          if (result.error) {
            setMutationError(result.error);
          } else {
            setEditingRow(null);
            setSuccessMessage(`Updated ${result.rowCount} row(s)`);
            void rowsQuery.refetch();
          }
        },
        onError: (err: Error) => {
          logClientError(err, { context: { source: 'CrudPanel', action: 'updateRow', table: selectedTable } });
          setMutationError(err.message);
        },
      }
    );
  };

  const handleDelete = (): void => {
    if (!deletingRow) return;
    setSuccessMessage(null);
    setMutationError(null);
    crudMutation.mutate(
      {
        table: selectedTable,
        operation: 'delete' as CrudOperation,
        type: dbType,
        primaryKey: getPrimaryKey(deletingRow),
      },
      {
        onSuccess: (result) => {
          if (result.error) {
            setMutationError(result.error);
          } else {
            setDeletingRow(null);
            setSuccessMessage(`Deleted ${result.rowCount} row(s)`);
            void rowsQuery.refetch();
          }
        },
        onError: (err: Error) => {
          logClientError(err, { context: { source: 'CrudPanel', action: 'deleteRow', table: selectedTable } });
          setMutationError(err.message);
        },
      }
    );
  };

  const rows = rowsQuery.data?.rows ?? [];
  const totalRows = rowsQuery.data?.totalRows ?? 0;
  const isLoadingRows = rowsQuery.isLoading;
  const errorMessage =
    mutationError ?? (rowsQuery.isError ? rowsQuery.error.message : null);
  const maxPage = Math.max(1, Math.ceil(totalRows / pageSize));
  const columns = tableDetail?.columns ?? [];
  const columnKeys = rows.length > 0 ? Object.keys(rows[0] ?? {}) : columns.map((c: DatabaseColumnInfo) => c.name);

  return (
    <div ref={panelRef} className='space-y-4'>
      {/* Table selector */}
      <div className='flex flex-wrap items-center gap-3'>
        <SelectSimple size='sm'
          value={selectedTable}
          onValueChange={(v: string): void => {
            setSelectedTable(v);
            setPage(1);
            setMutationError(null);
            setSuccessMessage(null);
          }}
          options={tableDetails.map((t: DatabaseTableDetail) => ({
            value: t.name,
            label: `${t.name} (~${t.rowEstimate} rows)`,
          }))}
          placeholder='Select a table...'
          triggerClassName='h-8 min-w-[240px] text-xs'
        />

        {selectedTable && (
          <>
            <RefreshButton
              onRefresh={fetchRows}
              isRefreshing={rowsQuery.isFetching}
            />
            <Button
              size='sm'
              onClick={(): void => setShowAddModal(true)}
              className='h-8 gap-1 text-xs'
            >
              <PlusIcon className='size-3' />
              Add Row
            </Button>
          </>
        )}
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className='rounded-md border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-300'>
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className='rounded-md border border-emerald-500/30 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-300'>
          {successMessage}
        </div>
      )}

      {/* Data browser */}
      {selectedTable && (
        <div className='rounded-lg border border-border/60 bg-card/40'>
          {isLoadingRows && <p className='p-4 text-xs text-gray-400'>Loading rows...</p>}

          {!isLoadingRows && rows.length === 0 && (
            <p className='p-4 text-xs text-gray-500'>No rows found in this table.</p>
          )}

          {!isLoadingRows && rows.length > 0 && (
            <>
              <div className='overflow-auto max-h-[50vh]'>
                <Table className='text-xs'>
                  <TableHeader className='sticky top-0 bg-card z-10'>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead className='w-20 font-medium'>Actions</TableHead>
                      {columnKeys.map((key: string) => (
                        <TableHead key={key} className='whitespace-nowrap font-medium font-mono'>
                          {key}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row: Record<string, unknown>, i: number) => (
                      <TableRow key={i} className='text-gray-300 hover:bg-muted/30'>
                        <TableCell className='py-1.5'>
                          <div className='flex items-center gap-1'>
                            <button
                              type='button'
                              onClick={(): void => setEditingRow(row)}
                              className='rounded p-1 text-gray-400 hover:bg-muted hover:text-blue-300'
                              title='Edit row'
                            >
                              <EditIcon className='size-3' />
                            </button>
                            <button
                              type='button'
                              onClick={(): void => setDeletingRow(row)}
                              className='rounded p-1 text-gray-400 hover:bg-muted hover:text-red-300'
                              title='Delete row'
                            >
                              <Trash2Icon className='size-3' />
                            </button>
                          </div>
                        </TableCell>
                        {columnKeys.map((key: string) => (
                          <TableCell
                            key={key}
                            className='max-w-[200px] truncate whitespace-nowrap font-mono py-1.5'
                            title={formatCellValue(row[key])}
                          >
                            {formatCellValue(row[key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className='flex items-center justify-between border-t border-border px-4 py-2'>
                <span className='text-xs text-gray-500'>
                  {totalRows.toLocaleString()} total rows
                </span>
                <Pagination
                  page={page}
                  totalPages={maxPage}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size: number) => {
                    setPage(1);
                    setPageSize(size);
                  }}
                  pageSizeOptions={[10, 20, 50, 100]}
                  showPageSize
                  className='scale-90 origin-right'
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && tableDetail && (
        <RowFormModal
          columns={tableDetail.columns}
          mode='add'
          onSubmit={handleAdd}
          onClose={(): void => setShowAddModal(false)}
          isPending={crudMutation.isPending}
        />
      )}

      {editingRow && tableDetail && (
        <RowFormModal
          columns={tableDetail.columns}
          initialData={editingRow}
          mode='edit'
          onSubmit={handleEdit}
          onClose={(): void => setEditingRow(null)}
          isPending={crudMutation.isPending}
        />
      )}

      {deletingRow && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open: boolean) => !open && setDeletingRow(null)}
          onConfirm={handleDelete}
          title='Delete Row'
          description='Are you sure you want to delete this row? This action cannot be undone.'
          confirmText='Delete'
          variant='destructive'
          loading={crudMutation.isPending}
        />
      )}
    </div>
  );
}
