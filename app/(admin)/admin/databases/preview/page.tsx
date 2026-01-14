"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BoxesIcon,
  BracesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DatabaseIcon,
  FileTextIcon,
  HashIcon,
  LayersIcon,
  ListIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TableIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type PreviewGroup = { type: string; objects: string[] };
type PreviewTable = { name: string; rowEstimate: number };
type PreviewRow = {
  name: string;
  rows: Record<string, unknown>[];
  totalRows: number;
};

const groupIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TABLE: TableIcon,
  "TABLE DATA": DatabaseIcon,
  VIEW: LayersIcon,
  "MATERIALIZED VIEW": LayersIcon,
  SEQUENCE: HashIcon,
  "SEQUENCE SET": HashIcon,
  FUNCTION: BracesIcon,
  TYPE: BoxesIcon,
  INDEX: ListIcon,
  TRIGGER: RefreshCwIcon,
  CONSTRAINT: ShieldCheckIcon,
  SCHEMA: FileTextIcon,
  EXTENSION: FileTextIcon,
};

function DatabasePreviewPageInner() {
  const searchParams = useSearchParams();
  const backupName = searchParams.get("backup") ?? "";
  const mode = searchParams.get("mode") ?? "backup";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMeta, setErrorMeta] = useState<{
    errorId?: string;
    stage?: string;
    backupName?: string;
    mode?: string;
  } | null>(null);
  const [content, setContent] = useState("");
  const [groups, setGroups] = useState<PreviewGroup[]>([]);
  const [tables, setTables] = useState<PreviewTable[]>([]);
  const [tableRows, setTableRows] = useState<PreviewRow[]>([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!backupName && mode !== "current") return;
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      setErrorMeta(null);
      setContent("");
      setGroups([]);
      setTables([]);
      setTableRows([]);
      try {
        const res = await fetch("/api/databases/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ backupName, mode, page, pageSize }),
        });
        const payload = (await res.json()) as {
          content?: string;
          error?: string;
          errorId?: string;
          stage?: string;
          backupName?: string;
          mode?: string;
          tables?: PreviewTable[];
          groups?: PreviewGroup[];
          tableRows?: PreviewRow[];
          page?: number;
          pageSize?: number;
        };
        if (!res.ok) {
          setError(payload.error ?? "Failed to preview backup.");
          setErrorMeta({
            errorId: payload.errorId,
            stage: payload.stage,
            backupName: payload.backupName,
            mode: payload.mode,
          });
          return;
        }
        setContent(payload.content ?? "No preview output.");
        setGroups(payload.groups ?? []);
        setTables(payload.tables ?? []);
        setTableRows(payload.tableRows ?? []);
        if (payload.page) setPage(payload.page);
        if (payload.pageSize) setPageSize(payload.pageSize);
      } catch (err) {
        console.error("Error loading preview:", err);
        setError("An error occurred during preview.");
        setErrorMeta(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchPreview();
  }, [backupName, mode, page, pageSize]);

  const copyRaw = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const grouped = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        Icon: groupIconMap[group.type] ?? FileTextIcon,
      })),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    if (!query) return grouped;
    return grouped
      .map((group) => {
        const matchesType = group.type.toLowerCase().includes(query);
        const objects = group.objects.filter((obj) =>
          obj.toLowerCase().includes(query)
        );
        if (!matchesType && objects.length === 0) return null;
        return matchesType
          ? group
          : { ...group, objects };
      })
      .filter((group): group is (typeof grouped)[number] => Boolean(group));
  }, [grouped, groupQuery]);

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleTable = (name: string) => {
    setExpandedTables((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const maxPage = useMemo(() => {
    if (tableRows.length === 0) return 1;
    const pages = tableRows.map((table) =>
      Math.max(1, Math.ceil(table.totalRows / pageSize))
    );
    return Math.max(1, ...pages);
  }, [pageSize, tableRows]);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Backup Preview</h1>
          <p className="mt-1 text-sm text-gray-400">
            {mode === "current"
              ? "Source: Current database"
              : backupName
                ? `Source: ${backupName}`
                : "No backup selected."}
          </p>
        </div>
        <Link
          href="/admin/databases"
          className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 hover:bg-gray-900"
        >
          Back to databases
        </Link>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Schema Objects
              </h2>
              <span className="text-xs text-gray-500">
                {filteredGroups.length} groups
              </span>
            </div>
            <input
              type="search"
              value={groupQuery}
              onChange={(event) => setGroupQuery(event.target.value)}
              placeholder="Filter objects or types..."
              className="w-full max-w-xs rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-500"
              aria-label="Filter schema objects"
            />
          </div>
          {loading && (
            <p className="mt-3 text-xs text-gray-400">Loading preview...</p>
          )}
          {error && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-red-300">{error}</p>
              {errorMeta?.errorId && (
                <div className="grid gap-2 rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      Error ID
                    </p>
                    <p className="mt-1 break-all text-gray-200">
                      {errorMeta.errorId}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      Stage
                    </p>
                    <p className="mt-1 break-all text-gray-200">
                      {errorMeta.stage || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      Source
                    </p>
                    <p className="mt-1 break-all text-gray-200">
                      {errorMeta.backupName || errorMeta.mode || "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {!loading && !error && filteredGroups.length === 0 && (
            <p className="mt-3 text-xs text-gray-500">
              No schema objects match the current filter.
            </p>
          )}
          {!loading && !error && filteredGroups.length > 0 && (
            <div className="mt-4 space-y-2">
              {filteredGroups.map((group) => {
                const expanded = expandedGroups[group.type] ?? false;
                return (
                  <div
                    key={group.type}
                    className="rounded-md border border-gray-800 bg-gray-900/60"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.type)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-gray-200"
                    >
                      <span className="flex items-center gap-2">
                        <group.Icon className="size-4 text-emerald-200" />
                        <span className="font-semibold">
                          {group.type} ({group.objects.length})
                        </span>
                      </span>
                      {expanded ? (
                        <ChevronDownIcon className="size-4 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="size-4 text-gray-400" />
                      )}
                    </button>
                    {expanded && (
                      <div className="border-t border-gray-800 px-3 py-2 text-xs text-gray-400">
                        {group.objects.join(", ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Tables & Row Estimates
            </h2>
            <span className="text-xs text-gray-500">
              {tables.length} tables
            </span>
          </div>
          {!loading && !error && tables.length === 0 && (
            <p className="mt-3 text-xs text-gray-500">
              No table data entries found.
            </p>
          )}
          {!loading && !error && tables.length > 0 && (
            <div className="mt-3 max-h-64 divide-y divide-gray-800 overflow-auto rounded-md border border-gray-800 bg-gray-900/60">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="flex items-center justify-between px-3 py-2 text-xs"
                >
                  <span className="text-gray-200">{table.name}</span>
                  <span className="text-gray-400">
                    ~{table.rowEstimate.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Row counts are current DB estimates, not dump totals.
          </p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Table Rows (first 20)
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{tableRows.length} tables</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Rows per table</label>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPage(1);
                    setPageSize(Number(event.target.value));
                  }}
                  className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200"
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800"
                >
                  Prev
                </button>
                <span className="px-2">
                  Page {page} / {maxPage}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(maxPage, prev + 1))}
                  disabled={page >= maxPage}
                  className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          {!loading && !error && tableRows.length === 0 && (
            <p className="mt-3 text-xs text-gray-500">
              No table rows available in this backup.
            </p>
          )}
          {!loading && !error && tableRows.length > 0 && (
            <div className="mt-4 space-y-2">
              {tableRows.map((table) => {
                const columns = table.rows[0]
                  ? Object.keys(table.rows[0])
                  : [];
                const expanded = expandedTables[table.name] ?? false;
                return (
                  <div
                    key={table.name}
                    className="rounded-md border border-gray-800 bg-gray-900/60"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTable(table.name)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-gray-200"
                    >
                      <span className="flex items-center gap-2">
                        <TableIcon className="size-4 text-emerald-200" />
                        <span className="font-semibold">
                          {table.name} ({table.rows.length} rows shown /{" "}
                          {table.totalRows.toLocaleString()} total)
                        </span>
                      </span>
                      {expanded ? (
                        <ChevronDownIcon className="size-4 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="size-4 text-gray-400" />
                      )}
                    </button>
                    {expanded && (
                      <div className="border-t border-gray-800 px-3 py-3">
                        {table.rows.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            No rows in this table.
                          </p>
                        ) : (
                          <div className="overflow-auto rounded-md border border-gray-800">
                            <table className="min-w-full text-xs text-gray-300">
                              <thead className="bg-gray-900/80 text-gray-400">
                                <tr>
                                  {columns.map((column) => (
                                    <th
                                      key={column}
                                      className="whitespace-nowrap px-3 py-2 text-left font-semibold"
                                    >
                                      {column}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((row, rowIndex) => (
                                  <tr
                                    key={`${table.name}-${rowIndex}`}
                                    className="border-t border-gray-800/60"
                                  >
                                    {columns.map((column) => (
                                      <td
                                        key={`${table.name}-${rowIndex}-${column}`}
                                        className="whitespace-nowrap px-3 py-2 align-top"
                                      >
                                        {(() => {
                                          const value = row[column];
                                          if (
                                            typeof value === "string" ||
                                            typeof value === "number" ||
                                            typeof value === "boolean"
                                          ) {
                                            return String(value);
                                          }
                                          if (value instanceof Date) {
                                            return value.toISOString();
                                          }
                                          if (value == null) return "";
                                          try {
                                            return JSON.stringify(value);
                                          } catch {
                                            return "";
                                          }
                                        })()}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Rows are extracted from a temporary restore of the backup.
          </p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Raw Backup List
            </h2>
            <button
              type="button"
              onClick={copyRaw}
              className="rounded-md border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
            >
              Copy
            </button>
          </div>
          <pre className="mt-3 max-h-[60vh] overflow-auto rounded-md border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-300 whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function DatabasePreviewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <DatabasePreviewPageInner />
    </Suspense>
  );
}
