"use client";

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToast, Label, ListPanel, SectionHeader, SectionPanel, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";




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

type MongoIndexDiagnostics = {
  generatedAt: string;
  collections: MongoCollectionIndexStatus[];
};

const formatTimestamp = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatDateParam = (value: string, endOfDay = false) => {
  if (!value) return null;
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function SystemLogsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [level, setLevel] = useState<SystemLogLevel | "all">(() => {
    const p = searchParams?.get("level");
    if (p && levelOptions.some((option) => option.value === p)) {
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

  const buildLogParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (level !== "all") params.set("level", level);
    if (query.trim()) params.set("query", query.trim());
    if (source.trim()) params.set("source", source.trim());
    const from = formatDateParam(fromDate);
    const to = formatDateParam(toDate, true);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params;
  }, [level, page, pageSize, query, source, fromDate, toDate]);

  const buildMetricsParams = useCallback(() => {
    const params = new URLSearchParams();
    if (level !== "all") params.set("level", level);
    if (query.trim()) params.set("query", query.trim());
    if (source.trim()) params.set("source", source.trim());
    const from = formatDateParam(fromDate);
    const to = formatDateParam(toDate, true);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params;
  }, [level, query, source, fromDate, toDate]);

  const logsQuery = useQuery<{
    logs?: SystemLogRecord[];
    total?: number;
    page?: number;
    pageSize?: number;
  }>({
    queryKey: ["system-logs", page, pageSize, level, query, source, fromDate, toDate],
    queryFn: async () => {
      const params = buildLogParams();
      const res = await fetch(`/api/system/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load system logs.");
      return (await res.json()) as {
        logs?: SystemLogRecord[];
        total?: number;
        page?: number;
        pageSize?: number;
      };
    },
  });

  const metricsQuery = useQuery<{ metrics?: SystemLogMetrics }>({
    queryKey: ["system-log-metrics", level, query, source, fromDate, toDate],
    queryFn: async () => {
      const params = buildMetricsParams();
      const res = await fetch(`/api/system/logs/metrics?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load system log metrics.");
      return (await res.json()) as { metrics?: SystemLogMetrics };
    },
  });

  const mongoDiagnosticsQuery = useQuery<MongoIndexDiagnostics>({
    queryKey: ["mongo-index-diagnostics"],
    queryFn: async () => {
      const res = await fetch("/api/system/diagnostics/mongo-indexes");
      if (!res.ok) throw new Error("Failed to load Mongo index diagnostics.");
      return (await res.json()) as MongoIndexDiagnostics;
    },
  });

  const rebuildIndexesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system/diagnostics/mongo-indexes", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to rebuild Mongo indexes.");
      return (await res.json()) as MongoIndexDiagnostics & {
        created?: Array<{ collection: string; key: Record<string, unknown> }>;
      };
    },
    onSuccess: () => {
      void mongoDiagnosticsQuery.refetch();
    },
  });

  useEffect(() => {
    if (!logsQuery.error) return;
    toast(
      logsQuery.error instanceof Error
        ? logsQuery.error.message
        : "Failed to load system logs.",
      { variant: "error" }
    );
  }, [logsQuery.error, toast]);

  useEffect(() => {
    if (!metricsQuery.error) return;
    toast(
      metricsQuery.error instanceof Error
        ? metricsQuery.error.message
        : "Failed to load system log metrics.",
      { variant: "error" }
    );
  }, [metricsQuery.error, toast]);

  useEffect(() => {
    if (!mongoDiagnosticsQuery.error) return;
    toast(
      mongoDiagnosticsQuery.error instanceof Error
        ? mongoDiagnosticsQuery.error.message
        : "Failed to load Mongo diagnostics.",
      { variant: "error" }
    );
  }, [mongoDiagnosticsQuery.error, toast]);

  const logs = logsQuery.data?.logs ?? [];
  const total = logsQuery.data?.total ?? 0;
  const metrics = metricsQuery.data?.metrics ?? null;
  const diagnostics = mongoDiagnosticsQuery.data?.collections ?? [];
  const diagnosticsUpdatedAt = mongoDiagnosticsQuery.data?.generatedAt ?? null;
  const loading = logsQuery.isPending;
  const metricsLoading = metricsQuery.isPending;
  const diagnosticsLoading = mongoDiagnosticsQuery.isPending;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear logs.");
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["system-logs"] });
      void queryClient.invalidateQueries({ queryKey: ["system-log-metrics"] });
    },
  });


  const clearLogs = async () => {
    if (!window.confirm("Clear all system logs?")) return;
    try {
      await clearLogsMutation.mutateAsync();
      toast("System logs cleared.", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to clear logs.", {
        variant: "error",
      });
    }
  };

  const rebuildMongoIndexes = async () => {
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
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to rebuild indexes.", {
        variant: "error",
      });
    }
  };

  const exportLogs = async () => {
    try {
      const payload = JSON.stringify(logs, null, 2);
      await navigator.clipboard.writeText(payload);
      toast("Logs copied to clipboard.", { variant: "success" });
    } catch (_error) {
      toast("Failed to copy logs.", { variant: "error" });
    }
  };

  const levelStyles: Record<string, string> = {
    error: "border-red-500/40 text-red-300 bg-red-500/10",
    warn: "border-yellow-500/40 text-yellow-300 bg-yellow-500/10",
    info: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  };

  const getContextValue = (context: unknown, path: string) => {
    if (!context || typeof context !== "object") return null;
    return path.split(".").reduce<unknown>((acc, key) => {
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
                  disabled={loading || metricsLoading}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
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
                  disabled={diagnosticsLoading}
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
            {diagnosticsLoading ? (
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
                    {diagnostics.map((collection) => {
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
                                  {collection.missing.map((item) => (
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
                  onValueChange={(value) => {
                    setLevel(value as SystemLogLevel | "all");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((option) => (
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
                  onChange={(event) => {
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
                  onChange={(event) => {
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
                    onChange={(event) => {
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
                    onChange={(event) => {
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
            {metricsLoading ? (
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
                      {metrics.topSources.map((item) => (
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
                      {metrics.topPaths.map((item) => (
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
            {loading ? (
              <div className="px-4 py-8 text-sm text-gray-400">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="px-4 py-8 text-sm text-gray-400">
                No system logs found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {logs.map((log) => (
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
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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
