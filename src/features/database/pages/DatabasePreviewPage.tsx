"use client";

import { Button, Input, Label, SectionHeader, SectionPanel } from "@/shared/ui";
import { Suspense, useMemo, useState } from "react";
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

import type {
  DatabasePreviewGroup,
  DatabasePreviewMode,
  DatabasePreviewRow,
  DatabasePreviewTable,
} from "../types";
import { useDatabasePreview } from "../hooks/useDatabaseQueries";

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

function DatabasePreviewPageInner(): React.JSX.Element {
  const searchParams = useSearchParams();
  const backupName = searchParams.get("backup") ?? "";
  const mode = searchParams.get("mode") ?? "backup";
  const previewType = searchParams.get("type") ?? "postgresql";
  const previewMode: DatabasePreviewMode =
    mode === "current" ? "current" : "backup";
  
  const [groupQuery, setGroupQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const { data: payload, isLoading: loading, error: queryError } = useDatabasePreview({
    backupName: backupName || undefined,
    mode: previewMode,
    type: previewType === "mongodb" ? "mongodb" : "postgresql",
    page,
    pageSize,
  });

  const error = queryError?.message || null;
  const errorMeta = (queryError as Error & { payload?: { errorId?: string; stage?: string; backupName?: string; mode?: string } })?.payload || null;

  const content = payload?.content ?? "";
  const groups: DatabasePreviewGroup[] = useMemo(() => payload?.groups ?? [], [payload?.groups]);
  const tables: DatabasePreviewTable[] = payload?.tables ?? [];
  const tableRows: DatabasePreviewRow[] = useMemo(() => payload?.tableRows ?? [], [payload?.tableRows]);

  const copyRaw = async (): Promise<void> => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const grouped = useMemo(
    () =>
      groups.map((group: DatabasePreviewGroup) => ({
        ...group,
        Icon: groupIconMap[group.type] ?? FileTextIcon,
      })),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    if (!query) return grouped;
    return grouped
      .map((group: (typeof grouped)[number]) => {
        const matchesType = group.type.toLowerCase().includes(query);
        const objects = group.objects.filter((obj: string) =>
          obj.toLowerCase().includes(query)
        );
        if (!matchesType && objects.length === 0) return null;
        return matchesType
          ? group
          : { ...group, objects };
      })
      .filter((group: (typeof grouped)[number] | null): group is (typeof grouped)[number] => Boolean(group));
  }, [grouped, groupQuery]);

  const toggleGroup = (type: string): void => {
    setExpandedGroups((prev: Record<string, boolean>) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleTable = (name: string): void => {
    setExpandedTables((prev: Record<string, boolean>) => ({ ...prev, [name]: !prev[name] }));
  };

  const maxPage = useMemo(() => {
    if (tableRows.length === 0) return 1;
    const pages = tableRows.map((table: DatabasePreviewRow) =>
      Math.max(1, Math.ceil(table.totalRows / pageSize))
    );
    return Math.max(1, ...pages);
  }, [pageSize, tableRows]);

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Backup Preview"
        description={
          mode === "current"
            ? "Source: Current database"
            : backupName
              ? `Source: ${backupName}`
              : "No backup selected."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/databases">Back to databases</Link>
          </Button>
        }
        className="mb-6"
      />

      <div className="space-y-6">
        <SectionPanel className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Schema Objects
              </h2>
              <span className="text-xs text-gray-500">
                {filteredGroups.length} groups
              </span>
            </div>
            <Input
              type="search"
              value={groupQuery}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setGroupQuery(event.target.value)}
              placeholder="Filter objects or types..."
              className="h-8 w-full max-w-xs text-xs"
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
                <div className="grid gap-2 rounded-md border border-border bg-card/60 p-3 text-xs text-gray-300 md:grid-cols-3">
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
              {filteredGroups.map((group: (typeof filteredGroups)[number]) => {
                const expanded = expandedGroups[group.type] ?? false;
                return (
                  <div
                    key={group.type}
                    className="rounded-md border border-border bg-card/60"
                  >
                    <Button
                      type="button"
                      onClick={(): void => toggleGroup(group.type)}
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
                    </Button>
                    {expanded && (
                      <div className="border-t border-border px-3 py-2 text-xs text-gray-400">
                        {group.objects.join(", ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>

        <SectionPanel className="p-5">
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
            <div className="mt-3 max-h-64 divide-y divide-border overflow-auto rounded-md border border-border bg-card/60">
              {tables.map((table: DatabasePreviewTable) => (
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
        </SectionPanel>

        <SectionPanel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Table Rows (first 20)
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{tableRows.length} tables</span>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Rows per table</Label>
                <select
                  value={pageSize}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => {
                    setPage(1);
                    setPageSize(Number(event.target.value));
                  }}
                  className="rounded-md border border-border bg-gray-900 px-2 py-1 text-xs text-gray-200"
                >
                  {[10, 20, 50, 100].map((size: number) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  onClick={(): void => setPage((prev: number) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-border bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:bg-muted/50"
                >
                  Prev
                </Button>
                <span className="px-2">
                  Page {page} / {maxPage}
                </span>
                <Button
                  type="button"
                  onClick={(): void => setPage((prev: number) => Math.min(maxPage, prev + 1))}
                  disabled={page >= maxPage}
                  className="rounded-md border border-border bg-gray-900 px-2 py-1 text-xs text-gray-200 hover:bg-muted/50"
                >
                  Next
                </Button>
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
              {tableRows.map((table: DatabasePreviewRow) => {
                const columns = table.rows[0]
                  ? Object.keys(table.rows[0])
                  : [];
                const expanded = expandedTables[table.name] ?? false;
                return (
                  <div
                    key={table.name}
                    className="rounded-md border border-border bg-card/60"
                  >
                    <Button
                      type="button"
                      onClick={(): void => toggleTable(table.name)}
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
                    </Button>
                    {expanded && (
                      <div className="border-t border-border px-3 py-3">
                        {table.rows.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            No rows in this table.
                          </p>
                        ) : (
                          <div className="overflow-auto rounded-md border border-border">
                            <table className="min-w-full text-xs text-gray-300">
                              <thead className="bg-gray-900/80 text-gray-400">
                                <tr>
                                  {columns.map((column: string) => (
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
                                {table.rows.map((row: Record<string, unknown>, rowIndex: number) => (
                                  <tr
                                    key={`${table.name}-${rowIndex}`}
                                    className="border-t border-border/60"
                                  >
                                    {columns.map((column: string) => (
                                      <td
                                        key={`${table.name}-${rowIndex}-${column}`}
                                        className="whitespace-nowrap px-3 py-2 align-top"
                                      >
                                        {(() : string => {
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
        </SectionPanel>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Raw Backup List
            </h2>
            <Button
              type="button"
              onClick={(): void => { void copyRaw(); }}
              className="rounded-md border border-border bg-gray-900 px-3 py-1.5 text-xs text-gray-200 hover:bg-muted/50"
            >
              Copy
            </Button>
          </div>
          <pre className="mt-3 max-h-[60vh] overflow-auto rounded-md border border-border bg-card/60 p-3 text-xs text-gray-300 whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function DatabasePreviewPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <DatabasePreviewPageInner />
    </Suspense>
  );
}
