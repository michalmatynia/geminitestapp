"use client";

import React from "react";
import { useSettingsMap } from "@/shared/hooks/use-settings";
import { AI_PATHS_LOCAL_RUNS_KEY, parseLocalRuns } from "@/features/ai/ai-paths/lib";
import type { AiPathLocalRunRecord } from "@/features/ai/ai-paths/lib";

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const formatDuration = (value?: number | null): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (value < 1000) return `${Math.max(0, Math.round(value))}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
};

const formatEntity = (run: AiPathLocalRunRecord): string => {
  if (!run.entityType && !run.entityId) return "-";
  if (run.entityType && run.entityId) return `${run.entityType}:${run.entityId}`;
  return run.entityType ?? run.entityId ?? "-";
};

export function LocalRunsPanel(): React.JSX.Element {
  const settingsQuery = useSettingsMap({ scope: "heavy" });
  const rawRuns = settingsQuery.data?.get(AI_PATHS_LOCAL_RUNS_KEY) ?? null;
  const runs = React.useMemo(() => parseLocalRuns(rawRuns), [rawRuns]);

  if (settingsQuery.isLoading) {
    return <div className="text-sm text-gray-400">Loading local runs...</div>;
  }

  if (runs.length === 0) {
    return <div className="text-sm text-gray-400">No local runs recorded yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card/40">
      <table className="w-full text-sm">
        <thead className="bg-card/60 text-xs uppercase text-gray-400">
          <tr>
            <th className="px-4 py-3 text-left">Started</th>
            <th className="px-4 py-3 text-left">Path</th>
            <th className="px-4 py-3 text-left">Trigger</th>
            <th className="px-4 py-3 text-left">Entity</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-gray-200">
          {runs.map((run: AiPathLocalRunRecord) => (
            <tr key={run.id} className="hover:bg-card/60">
              <td className="px-4 py-3 text-xs text-gray-300">{formatDate(run.startedAt)}</td>
              <td className="px-4 py-3 text-xs">
                <div className="font-medium text-gray-100">{run.pathName ?? "Untitled path"}</div>
                <div className="text-[10px] text-gray-500">{run.pathId ?? "-"}</div>
              </td>
              <td className="px-4 py-3 text-xs">
                <div className="font-medium text-gray-100">{run.triggerLabel ?? run.triggerEvent ?? "-"}</div>
                <div className="text-[10px] text-gray-500">{run.triggerEvent ?? "-"}</div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-300">{formatEntity(run)}</td>
              <td className="px-4 py-3 text-xs">
                <span
                  className={`rounded-full border px-2 py-1 text-[10px] uppercase ${
                    run.status === "success"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  }`}
                  title={run.error ?? undefined}
                >
                  {run.status}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-300">{formatDuration(run.durationMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
