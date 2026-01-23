"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { RefreshCcw, Trash2, Download } from "lucide-react";
import type { SystemLogRecord, SystemLogLevel } from "@/types";

const levelOptions: Array<{ value: SystemLogLevel | "all"; label: string }> = [
  { value: "all", label: "All levels" },
  { value: "error", label: "Errors" },
  { value: "warn", label: "Warnings" },
  { value: "info", label: "Info" },
];

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
  const [logs, setLogs] = useState<SystemLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<SystemLogLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
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

      const res = await fetch(`/api/system/logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load system logs.");
      const data = (await res.json()) as {
        logs?: SystemLogRecord[];
        total?: number;
        page?: number;
        pageSize?: number;
      };
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load system logs.", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [level, page, pageSize, query, source, fromDate, toDate, toast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const clearLogs = async () => {
    if (!window.confirm("Clear all system logs?")) return;
    try {
      const res = await fetch("/api/system/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear logs.");
      toast("System logs cleared.", { variant: "success" });
      await loadLogs();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to clear logs.", {
        variant: "error",
      });
    }
  };

  const exportLogs = async () => {
    try {
      const payload = JSON.stringify(logs, null, 2);
      await navigator.clipboard.writeText(payload);
      toast("Logs copied to clipboard.", { variant: "success" });
    } catch (error) {
      toast("Failed to copy logs.", { variant: "error" });
    }
  };

  const levelStyles: Record<string, string> = {
    error: "border-red-500/40 text-red-300 bg-red-500/10",
    warn: "border-yellow-500/40 text-yellow-300 bg-yellow-500/10",
    info: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">System Logs</h1>
          <p className="mt-2 text-sm text-gray-400">
            Centralized error and warning events captured across the platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadLogs()}
            className="border-gray-700"
            disabled={loading}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            className="border-gray-700"
            disabled={logs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Copy JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
            className="border-red-500/40 text-red-200 hover:bg-red-500/10"
            disabled={logs.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Logs
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-gray-800 bg-gray-900 p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-xs text-gray-400">Level</label>
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
            <label className="text-xs text-gray-400">Search</label>
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
            <label className="text-xs text-gray-400">Source</label>
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
              <label className="text-xs text-gray-400">From</label>
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
              <label className="text-xs text-gray-400">To</label>
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
      </div>

      <div className="mt-6 rounded-md border border-gray-800 bg-gray-950/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-4 py-3 text-xs text-gray-400">
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
          <div className="divide-y divide-gray-800">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs ${
                        levelStyles[log.level] ?? "border-gray-700 text-gray-300"
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
                {(log.context || log.stack) && (
                  <details className="mt-2 text-xs text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-200">
                      Details
                    </summary>
                    {log.stack && (
                      <pre className="mt-2 whitespace-pre-wrap rounded border border-gray-800 bg-gray-950 p-2 text-[11px] text-gray-300">
                        {log.stack}
                      </pre>
                    )}
                    {log.context && (
                      <pre className="mt-2 whitespace-pre-wrap rounded border border-gray-800 bg-gray-950 p-2 text-[11px] text-gray-300">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    )}
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-gray-800 px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
