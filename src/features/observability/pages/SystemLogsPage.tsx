"use client";

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast, Label, ListPanel, SectionHeader, SectionPanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useSystemLogs, useSystemLogMetrics, useMongoDiagnostics } from "@/features/observability/hooks/useLogQueries";
import { useClearLogsMutation, useRebuildIndexesMutation } from "@/features/observability/hooks/useLogMutations";

import { RefreshCcw, Trash2, Download } from "lucide-react";
import type { SystemLogMetrics, SystemLogRecord, SystemLogLevel } from "@/shared/types/system-logs";

const levelOptions: Array<{ value: SystemLogLevel | "all"; label: string }> = [
  { value: "all", label: "All levels" },
  { value: "error", label: "Errors" },
  { value: "warn", label: "Warnings" },
  { value: "info", label: "Info" },
];

type MongoIndexInfo = {
  name?: string;
  key: Record<string, unknown>;
};

type MongoCollectionIndexStatus = {
  name: string;
  expected: MongoIndexInfo[];
  existing: MongoIndexInfo[];
  missing: MongoIndexInfo[];
  extra: MongoIndexInfo[];
  error?: string;
};

const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatDateParam = (value: string, endOfDay: boolean = false): string | null => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function SystemLogsPage(): React.JSX.Element {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [level, setLevel] = useState<SystemLogLevel | "all">(() => {
    const p = searchParams?.get("level");
    if (p && levelOptions.some((option: (typeof levelOptions)[number]) => option.value === p)) {
      return p as SystemLogLevel | "all";
    }
    return "all";
  });

  const [query, setQuery] = useState(() => searchParams?.get("query") ?? "");
  const [source, setSource] = useState(() => searchParams?.get("source") ?? "");
  
  const [fromDate, setFromDate] = useState(() => {
    const p = searchParams?.get("from");
    if (!p) return "";
    const date = new Date(p);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  });

  const [toDate, setToDate] = useState(() => {
    const p = searchParams?.get("to");
    if (!p) return "";
    const date = new Date(p);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  });

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filters = useMemo(() => ({
    page,
    pageSize,
    level,
    query,
    source,
    from: formatDateParam(fromDate),
    to: formatDateParam(toDate, true),
  }), [page, pageSize, level, query, source, fromDate, toDate]);

  const metricsFilters = useMemo(() => ({
    level,
    query,
    source,
    from: formatDateParam(fromDate),
    to: formatDateParam(toDate, true),
  }), [level, query, source, fromDate, toDate]);

  // Queries
  const logsQuery = useSystemLogs(filters);
  const metricsQuery = useSystemLogMetrics(metricsFilters);
  const mongoDiagnosticsQuery = useMongoDiagnostics();

  // Mutations
  const clearLogsMutation = useClearLogsMutation();
  const rebuildIndexesMutation = useRebuildIndexesMutation();

  useEffect(() => {
    if (logsQuery.error) toast((logsQuery.error as Error).message, { variant: "error" });
  }, [logsQuery.error, toast]);

  useEffect(() => {
    if (metricsQuery.error) toast((metricsQuery.error as Error).message, { variant: "error" });
  }, [metricsQuery.error, toast]);

  useEffect(() => {
    if (mongoDiagnosticsQuery.error) toast((mongoDiagnosticsQuery.error as Error).message, { variant: "error" });
  }, [mongoDiagnosticsQuery.error, toast]);

  const logs = logsQuery.data?.logs ?? [];
  const total = logsQuery.data?.total ?? 0;
  const metrics = metricsQuery.data?.metrics ?? null;
  const diagnostics = mongoDiagnosticsQuery.data?.collections ?? [];
  const diagnosticsUpdatedAt = mongoDiagnosticsQuery.data?.generatedAt ?? null;

  const totalPages: number = useMemo((): number => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const clearLogs = async (): Promise<void> => {
    if (!window.confirm("Clear all system logs?")) return;
    try {
      await clearLogsMutation.mutateAsync();
      toast("System logs cleared.", { variant: "success" });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to clear logs.", {
        variant: "error",
      });
    }
  };

  const rebuildMongoIndexes = async (): Promise<void> => {
    if (!window.confirm("Rebuild missing Mongo indexes for AI Paths runtime?")) return;
    try {
      const result = await rebuildIndexesMutation.mutateAsync();
      const createdCount = result?.created?.length ?? 0;
      toast(
        createdCount > 0
          ? `Rebuilt ${createdCount} index(es).`
          : "Mongo indexes already up to date.",
        { variant: "success" }
      );
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to rebuild indexes.", {
        variant: "error",
      });
    }
  };

  const exportLogs = async (): Promise<void> => {
    try {
      const payload = JSON.stringify(logs, null, 2);
      await navigator.clipboard.writeText(payload);
      toast("Logs copied to clipboard.", { variant: "success" });
    } catch (_error: unknown) {
      toast("Failed to copy logs.", { variant: "error" });
    }
  };

  const levelStyles: Record<string, string> = {
    error: "border-red-500/40 text-red-300 bg-red-500/10",
    warn: "border-yellow-500/40 text-yellow-300 bg-yellow-500/10",
    info: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  };

  const getContextValue = (context: unknown, path: string): unknown => {
    if (!context || typeof context !== "object") return null;
    return path.split(".").reduce<unknown>((acc: unknown, key: string): unknown => {
      if (!acc || typeof acc !== "object") return null;
      return (acc as Record<string, unknown>)[key] ?? null;
    }, context);
  };

  const levels = metrics?.levels ?? { error: 0, warn: 0, info: 0 };

  return (
    <div className="container mx-auto py-10">
      <ListPanel
        header={
          <SectionHeader
            title="System Logs"
            description="Centralized error and warning events captured across the platform."
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.assign("/admin/settings/logging")}
                >
                  Client Logging Settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void logsQuery.refetch();
                    void metricsQuery.refetch();
                  }}
                  disabled={logsQuery.isFetching || metricsQuery.isFetching}
                >
                  <RefreshCcw className={`mr-2 h-4 w-4 ${(logsQuery.isFetching || metricsQuery.isFetching) ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void exportLogs()}
                  disabled={logs.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Copy JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void clearLogs()}
                  className="border-red-500/40 text-red-200 hover:bg-red-500/10"
                  disabled={logs.length === 0 || clearLogsMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {clearLogsMutation.isPending ? "Clearing..." : "Clear Logs"}
                </Button>
              </>
            }
          />
        }
        alerts={
          <SectionPanel className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">Diagnostics</div>
                <div className="text-xs text-gray-400">
                  Mongo index status for AI Paths runtime collections.
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  {diagnosticsUpdatedAt
                    ? `Updated ${formatTimestamp(diagnosticsUpdatedAt)}`
                    : "—"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void mongoDiagnosticsQuery.refetch()}
                  disabled={mongoDiagnosticsQuery.isFetching}
                >
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void rebuildMongoIndexes()}
                  disabled={rebuildIndexesMutation.isPending}
                  className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
                >
                  {rebuildIndexesMutation.isPending ? "Rebuilding..." : "Rebuild missing indexes"}
                </Button>
              </div>
            </div>
            {mongoDiagnosticsQuery.isLoading ? (
              <div className="text-sm text-gray-400">Loading diagnostics...</div>
            ) : diagnostics.length === 0 ? (
              <div className="text-sm text-gray-400">No diagnostics available.</div>
            ) : (
              <div className="rounded-md border border-border/70 bg-card/60">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60">
                      <TableHead className="text-xs text-gray-400">Collection</TableHead>
                      <TableHead className="text-xs text-gray-400">Expected</TableHead>
                      <TableHead className="text-xs text-gray-400">Missing</TableHead>
                      <TableHead className="text-xs text-gray-400">Extra</TableHead>
                      <TableHead className="text-xs text-gray-400 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diagnostics.map((collection: MongoCollectionIndexStatus) => {
                      const missingCount = collection.missing.length;
                      const extraCount = collection.extra.length;
                      const statusLabel = collection.error
                        ? "Error"
                        : missingCount === 0
                          ? "OK"
                          : "Missing";
                      return (
                        <TableRow key={collection.name} className="border-border/50">
                          <TableCell className="font-mono text-xs text-gray-200">
                            {collection.name}
                          </TableCell>
                          <TableCell className="text-xs text-gray-300">
                            {collection.expected.length}
                          </TableCell>
                          <TableCell className="text-xs text-gray-300">
                            {collection.error ? (
                              <div className="space-y-1 text-rose-200">
                                <div>—</div>
                                <div className="rounded bg-rose-500/10 px-2 py-1 text-[10px]">
                                  {collection.error}
                                </div>
                              </div>
                            ) : missingCount === 0 ? (
                              "0"
                            ) : (
                              <div className="space-y-1">
                                <div className="text-amber-200">{missingCount}</div>
                                <div className="space-y-1 text-[10px] text-amber-200">
                                  {collection.missing.map((item: MongoIndexInfo) => (
                                    <div
                                      key={JSON.stringify(item.key)}
                                      className="rounded bg-amber-500/10 px-2 py-1"
                                    >
                                      {JSON.stringify(item.key)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-gray-300">
                            {extraCount}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`rounded border px-2 py-0.5 text-xs ${
                                collection.error
                                  ? "border-rose-400/40 text-rose-200 bg-rose-500/10"
                                  : missingCount === 0
                                  ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
                                  : "border-amber-400/40 text-amber-200 bg-amber-500/10"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionPanel>
        }
        filters={
          <SectionPanel>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="text-xs text-gray-400">Level</Label>
                <Select
                  value={level}
                  onValueChange={(value: string): void => {
                    setLevel(value as SystemLogLevel | "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((option: (typeof levelOptions)[number]) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Search</Label>
                <Input
                  className="mt-2"
                  placeholder="Message or source"
                  value={query}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Source</Label>
                <Input
                  className="mt-2"
                  placeholder="api/products, auth, etc."
                  value={source}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                    setSource(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-400">From</Label>
                  <Input
                    className="mt-2"
                    type="date"
                    value={fromDate}
                    onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                      setFromDate(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400">To</Label>
                  <Input
                    className="mt-2"
                    type="date"
                    value={toDate}
                    onChange={(event: ChangeEvent<HTMLInputElement>): void => {
                      setToDate(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
          </SectionPanel>
        }
      >
        <div className="space-y-6">
          <div className="rounded-md border border-border bg-card/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Metrics</h2>
                <p className="text-xs text-gray-400">
                  Metrics reflect the current filters.
                </p>
              </div>
              <div className="text-xs text-gray-500">
                {metrics?.generatedAt ? `Updated ${formatTimestamp(metrics.generatedAt)}` : "—"}
              </div>
            </div>
            {metricsQuery.isLoading ? (
              <div className="mt-4 text-sm text-gray-400">Loading metrics...</div>
            ) : !metrics ? (
              <div className="mt-4 text-sm text-gray-400">
                No metrics available yet.
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs text-gray-400">Totals</div>
                  <div className="mt-2 space-y-1 text-sm text-gray-200">
                    <div>Total: {metrics.total}</div>
                    <div>Last 24h: {metrics.last24Hours}</div>
                    <div>Last 7d: {metrics.last7Days}</div>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs text-gray-400">By level</div>
                  <div className="mt-2 space-y-1 text-sm text-gray-200">
                    <div className="text-red-300">Errors: {levels.error}</div>
                    <div className="text-yellow-300">Warnings: {levels.warn}</div>
                    <div className="text-blue-300">Info: {levels.info}</div>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <div className="text-xs text-gray-400">Top sources</div>
                  {metrics.topSources.length === 0 ? (
                    <div className="mt-2 text-xs text-gray-500">No sources yet.</div>
                  ) : (
                    <div className="mt-2 space-y-1 text-xs text-gray-300">
                      {metrics.topSources.map((item: SystemLogMetrics["topSources"][number]) => (
                        <div key={item.source} className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.source}</span>
                          <span className="text-gray-500">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 text-xs text-gray-400">Top paths</div>
                  {metrics.topPaths.length === 0 ? (
                    <div className="mt-2 text-xs text-gray-500">No paths yet.</div>
                  ) : (
                    <div className="mt-2 space-y-1 text-xs text-gray-300">
                      {metrics.topPaths.map((item: SystemLogMetrics["topPaths"][number]) => (
                        <div key={item.path} className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.path}</span>
                          <span className="text-gray-500">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-card/50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 text-xs text-gray-400">
              <span>
                Showing {logs.length} of {total} logs
              </span>
              <span>Page {page} of {totalPages}</span>
            </div>
            {logsQuery.isLoading ? (
              <div className="px-4 py-8 text-sm text-gray-400">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="px-4 py-8 text-sm text-gray-400">
                No system logs found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log: SystemLogRecord) => (
                  <div key={log.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded border px-2 py-0.5 text-xs ${
                            levelStyles[log.level] ?? "border text-gray-300"
                          }`}
                        >
                          {log.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(log.createdAt)}
                        </span>
                      </div>
                      {log.source ? (
                        <span className="text-xs text-gray-500">{log.source}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-gray-200">{log.message}</div>
                    {(log.path || log.method || log.statusCode) && (
                      <div className="mt-2 text-xs text-gray-500">
                        {log.method ? `${log.method} ` : ""}
                        {log.path ?? ""}
                        {log.statusCode ? ` • ${log.statusCode}` : ""}
                      </div>
                    )}
                    {log.context && getContextValue(log.context, "fingerprint") ? (
                      <div className="mt-2 text-xs text-gray-500">
                        Fingerprint:{" "}
                        <span className="font-mono text-gray-300">
                          {String(getContextValue(log.context, "fingerprint"))}
                        </span>
                      </div>
                    ) : null}
                    {(log.context || log.stack) && (
                      <details className="mt-2 text-xs text-gray-400">
                        <summary className="cursor-pointer hover:text-gray-200">
                          Details
                        </summary>
                        {log.source === "client" && log.context ? (
                          <div className="mt-2 rounded border border-border bg-card p-2 text-[11px] text-gray-300">
                            <div className="font-semibold text-gray-200">Client context</div>
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              <div>
                                <div className="text-gray-500">App</div>
                                <div>{String((getContextValue(log.context, "app.version") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">Build</div>
                                <div>{String((getContextValue(log.context, "app.buildId") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">Release</div>
                                <div>{String((getContextValue(log.context, "app.releaseChannel") as string | number | null) ?? "—")}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">User</div>
                                <div>{String((getContextValue(log.context, "user.email") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">Role</div>
                                <div>{String((getContextValue(log.context, "user.role") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">Route</div>
                                <div>{String((getContextValue(log.context, "route") as string | number | null) ?? "—")}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Device</div>
                                <div>{String((getContextValue(log.context, "device.platform") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">Memory</div>
                                <div>{String((getContextValue(log.context, "device.deviceMemory") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">Cores</div>
                                <div>{String((getContextValue(log.context, "device.hardwareConcurrency") as string | number | null) ?? "—")}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Network</div>
                                <div>{String((getContextValue(log.context, "network.effectiveType") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">Downlink</div>
                                <div>{String((getContextValue(log.context, "network.downlink") as string | number | null) ?? "—")}</div>
                                <div className="text-gray-500">RTT</div>
                                <div>{String((getContextValue(log.context, "network.rtt") as string | number | null) ?? "—")}</div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {log.stack && (
                          <pre className="mt-2 whitespace-pre-wrap rounded border border-border bg-card p-2 text-[11px] text-gray-300">
                            {log.stack}
                          </pre>
                        )}
                        {log.context && (
                          <pre className="mt-2 whitespace-pre-wrap rounded border border-border bg-card p-2 text-[11px] text-gray-300">
                            {JSON.stringify(log.context, null, 2)}
                          </pre>
                        )}
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <Button
                variant="outline"
                size="sm"
                className="border"
                disabled={page <= 1}
                onClick={() => setPage((prev: number) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border"
                disabled={page >= totalPages}
                onClick={() => setPage((prev: number) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </ListPanel>
    </div>
  );
}