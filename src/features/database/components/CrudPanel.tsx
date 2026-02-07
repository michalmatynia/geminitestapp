'use client';

import {
  AlertTriangleIcon,
  EditIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { logClientError } from '@/features/observability';
import {
  Badge,
  Button,
  Input,
  Pagination,
  SectionPanel,
} from '@/shared/ui';

import { useCrudMutation, useSqlQueryMutation } from '../hooks/useDatabaseQueries';

import type {
  CrudOperation,
  DatabaseColumnInfo,
  DatabaseTableDetail,
  DatabaseType,
  SqlQueryResult,
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
      if (initialData && initialData[col.name] !== undefined) {
        initial[col.name] = formatCellValue(initialData[col.name]);
      } else {
        initial[col.name] = '';
      }
    }
    return initial;
  });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg max-h-[80vh] overflow-auto rounded-lg border border-border bg-background p-6 shadow-lg">
        <h3 className="text-sm font-semibold text-white mb-4">
          {mode === 'add' ? 'Add New Row' : 'Edit Row'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {columns.map((col: DatabaseColumnInfo) => (
            <div key={col.name}>
              <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span className="font-mono">{col.name}</span>
                <span className="text-gray-600">({col.type})</span>
                {col.isPrimaryKey && <Badge variant="default" className="text-[9px]">PK</Badge>}
                {!col.nullable && !col.isPrimaryKey && (
                  <span className="text-red-400">*</span>
                )}
              </label>
              <Input
                value={formData[col.name] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: Record<string, string>) => ({ ...prev, [col.name]: e.target.value }))
                }
                placeholder={col.defaultValue ?? (col.nullable ? 'NULL' : 'required')}
                className="h-8 font-mono text-xs"
                disabled={mode === 'edit' && col.isPrimaryKey}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Saving...' : mode === 'add' ? 'Insert Row' : 'Update Row'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Modal ─── */

function DeleteConfirmModal({
  onConfirm,
  onClose,
  isPending,
}: {
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangleIcon className="size-5 text-red-400" />
          <h3 className="text-sm font-semibold text-white">Delete Row</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Are you sure you want to delete this row? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main CRUD Panel ─── */

export function CrudPanel({
  tableDetails,
  defaultTable,
  dbType = 'postgresql',
}: {
  tableDetails: DatabaseTableDetail[];
  defaultTable?: string;
  dbType?: DatabaseType;
}): React.JSX.Element {
  const [selectedTable, setSelectedTable] = useState(defaultTable ?? '');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync when parent changes the default table (e.g. clicking "Manage" on a different table)
  useEffect(() => {
    if (defaultTable && defaultTable !== selectedTable) {
      setSelectedTable(defaultTable);
      setPage(1);
      setRows([]);
      setError(null);
      setSuccessMessage(null);
    }
  }, [defaultTable, selectedTable]);  

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [deletingRow, setDeletingRow] = useState<Record<string, unknown> | null>(null);

  const queryMutation = useSqlQueryMutation();
  const crudMutation = useCrudMutation();

  const tableDetail = useMemo(
    () => tableDetails.find((t: DatabaseTableDetail) => t.name === selectedTable),
    [tableDetails, selectedTable]
  );

  const primaryKeyColumns = useMemo(
    () => (tableDetail?.columns ?? []).filter((c: DatabaseColumnInfo) => c.isPrimaryKey),
    [tableDetail]
  );

  const fetchRows = useCallback(() => {
    if (!selectedTable) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const offset = (page - 1) * pageSize;

    if (dbType === 'postgresql') {
      queryMutation.mutate(
        {
          sql: `SELECT * FROM "${selectedTable}" LIMIT ${pageSize} OFFSET ${offset}`,
          type: 'postgresql',
        },
        {
          onSuccess: (data: SqlQueryResult) => {
            if (data.error) {
              setError(data.error);
              setRows([]);
              setTotalRows(0);
            } else {
              setRows(data.rows);
              // Also get count
              queryMutation.mutate(
                {
                  sql: `SELECT COUNT(*)::bigint AS total FROM "${selectedTable}"`,
                  type: 'postgresql',
                },
                {
                  onSuccess: (countData: SqlQueryResult) => {
                    const total = Number((countData.rows[0] as Record<string, unknown>)?.total ?? 0);
                    setTotalRows(total);
                    setLoading(false);
                  },
                  onError: (err: Error) => {
                    logClientError(err, { context: { source: 'CrudPanel', action: 'fetchCount', table: selectedTable } });
                    setLoading(false);
                  },
                }
              );
            }
          },
          onError: (err: Error) => {
            logClientError(err, { context: { source: 'CrudPanel', action: 'fetchRows', table: selectedTable } });
            setError(err.message);
            setLoading(false);
          },
        }
      );
    } else {
      queryMutation.mutate(
        {
          type: 'mongodb',
          collection: selectedTable,
          operation: 'find',
          filter: {},
        },
        {
          onSuccess: (data: SqlQueryResult) => {
            if (data.error) {
              setError(data.error);
            } else {
              setRows(data.rows);
              setTotalRows(data.rowCount);
            }
            setLoading(false);
          },
          onError: (err: Error) => {
            logClientError(err, { context: { source: 'CrudPanel', action: 'fetchRowsMongo', table: selectedTable } });
            setError(err.message);
            setLoading(false);
          },
        }
      );
    }
  }, [selectedTable, page, pageSize, dbType, queryMutation]);

  // Fetch when table or page changes
  useEffect(() => {
    if (selectedTable) fetchRows();
     
  }, [selectedTable, page, pageSize, fetchRows]);

  const getPrimaryKey = (row: Record<string, unknown>): Record<string, unknown> => {
    const pk: Record<string, unknown> = {};
    if (dbType === 'mongodb') {
      pk._id = row._id;
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
    crudMutation.mutate(
      { table: selectedTable, operation: 'insert' as CrudOperation, type: dbType, data },
      {
        onSuccess: (result) => {
          if (result.error) {
            setError(result.error);
          } else {
            setShowAddModal(false);
            setSuccessMessage(`Inserted ${result.rowCount} row(s)`);
            fetchRows();
          }
        },
        onError: (err: Error) => {
          logClientError(err, { context: { source: 'CrudPanel', action: 'insertRow', table: selectedTable } });
          setError(err.message);
        },
      }
    );
  };

  const handleEdit = (data: Record<string, unknown>): void => {
    if (!editingRow) return;
    setSuccessMessage(null);
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
            setError(result.error);
          } else {
            setEditingRow(null);
            setSuccessMessage(`Updated ${result.rowCount} row(s)`);
            fetchRows();
          }
        },
        onError: (err: Error) => {
          logClientError(err, { context: { source: 'CrudPanel', action: 'updateRow', table: selectedTable } });
          setError(err.message);
        },
      }
    );
  };

  const handleDelete = (): void => {
    if (!deletingRow) return;
    setSuccessMessage(null);
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
            setError(result.error);
          } else {
            setDeletingRow(null);
            setSuccessMessage(`Deleted ${result.rowCount} row(s)`);
            fetchRows();
          }
        },
        onError: (err: Error) => {
          logClientError(err, { context: { source: 'CrudPanel', action: 'deleteRow', table: selectedTable } });
          setError(err.message);
        },
      }
    );
  };

  const maxPage = Math.max(1, Math.ceil(totalRows / pageSize));
  const columns = tableDetail?.columns ?? [];
  const columnKeys = rows.length > 0 ? Object.keys(rows[0] ?? {}) : columns.map((c: DatabaseColumnInfo) => c.name);

  return (
    <div ref={panelRef} className="space-y-4">
      {/* Table selector */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedTable}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>): void => {
            setSelectedTable(e.target.value);
            setPage(1);
            setRows([]);
            setError(null);
            setSuccessMessage(null);
          }}
          className="h-8 rounded-md border border-border bg-card px-2 text-xs text-gray-200 min-w-[200px]"
        >
          <option value="">Select a table...</option>
          {tableDetails.map((t: DatabaseTableDetail) => (
            <option key={t.name} value={t.name}>
              {t.name} (~{t.rowEstimate} rows)
            </option>
          ))}
        </select>

        {selectedTable && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRows}
              disabled={loading}
              className="h-8 gap-1 text-xs"
            >
              <RefreshCwIcon className="size-3" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={(): void => setShowAddModal(true)}
              className="h-8 gap-1 text-xs"
            >
              <PlusIcon className="size-3" />
              Add Row
            </Button>
          </>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-300">
          {successMessage}
        </div>
      )}

      {/* Data browser */}
      {selectedTable && (
        <SectionPanel className="p-0">
          {loading && <p className="p-4 text-xs text-gray-400">Loading rows...</p>}

          {!loading && rows.length === 0 && (
            <p className="p-4 text-xs text-gray-500">No rows found in this table.</p>
          )}

          {!loading && rows.length > 0 && (
            <>
              <div className="overflow-auto max-h-[50vh]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-left text-gray-500">
                      <th className="px-3 py-2 font-medium">Actions</th>
                      {columnKeys.map((key: string) => (
                        <th key={key} className="whitespace-nowrap px-3 py-2 font-medium font-mono">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row: Record<string, unknown>, i: number) => (
                      <tr key={i} className="text-gray-300 hover:bg-muted/30">
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(): void => setEditingRow(row)}
                              className="rounded p-1 text-gray-400 hover:bg-muted hover:text-blue-300"
                              title="Edit row"
                            >
                              <EditIcon className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(): void => setDeletingRow(row)}
                              className="rounded p-1 text-gray-400 hover:bg-muted hover:text-red-300"
                              title="Delete row"
                            >
                              <Trash2Icon className="size-3" />
                            </button>
                          </div>
                        </td>
                        {columnKeys.map((key: string) => (
                          <td
                            key={key}
                            className="max-w-[200px] truncate whitespace-nowrap px-3 py-1.5 font-mono"
                            title={formatCellValue(row[key])}
                          >
                            {formatCellValue(row[key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border px-4 py-2">
                <span className="text-xs text-gray-500">
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
                  className="scale-90 origin-right"
                />
              </div>
            </>
          )}
        </SectionPanel>
      )}

      {/* Modals */}
      {showAddModal && tableDetail && (
        <RowFormModal
          columns={tableDetail.columns}
          mode="add"
          onSubmit={handleAdd}
          onClose={(): void => setShowAddModal(false)}
          isPending={crudMutation.isPending}
        />
      )}

      {editingRow && tableDetail && (
        <RowFormModal
          columns={tableDetail.columns}
          initialData={editingRow}
          mode="edit"
          onSubmit={handleEdit}
          onClose={(): void => setEditingRow(null)}
          isPending={crudMutation.isPending}
        />
      )}

      {deletingRow && (
        <DeleteConfirmModal
          onConfirm={handleDelete}
          onClose={(): void => setDeletingRow(null)}
          isPending={crudMutation.isPending}
        />
      )}
    </div>
  );
}