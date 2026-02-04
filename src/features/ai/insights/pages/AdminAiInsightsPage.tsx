"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { AiInsightRecord } from "@/shared/types";
import { Button, SectionHeader, SectionPanel } from "@/shared/ui";
import { useToast } from "@/shared/ui";

type InsightResponse = { insights: AiInsightRecord[] };

const statusClass = (status: AiInsightRecord["status"]): string => {
  if (status === "ok") return "border-emerald-500/40 text-emerald-200";
  if (status === "warning") return "border-amber-500/40 text-amber-200";
  return "border-rose-500/40 text-rose-200";
};

const InsightCard = ({ insight }: { insight: AiInsightRecord }): React.JSX.Element => (
  <div className="rounded-md border border-border/60 bg-gray-950/40 p-3 text-xs text-gray-300">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase text-gray-500">
        {new Date(insight.createdAt).toLocaleString()}
      </span>
      <span className={`rounded border px-2 py-0.5 text-[10px] ${statusClass(insight.status)}`}>
        {insight.status}
      </span>
    </div>
    <div className="mt-2 text-sm text-white">{insight.summary}</div>
    {insight.warnings.length > 0 ? (
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200">
        {insight.warnings.map((warning, index) => (
          <li key={`${insight.id}-warn-${index}`}>{warning}</li>
        ))}
      </ul>
    ) : null}
  </div>
);

export default function AdminAiInsightsPage(): React.JSX.Element {
  const { toast } = useToast();

  const analyticsQuery = useQuery({
    queryKey: ["ai-insights", "analytics"],
    queryFn: async (): Promise<InsightResponse> => {
      const res = await fetch("/api/analytics/insights?limit=10");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load analytics insights.");
      }
      return (await res.json()) as InsightResponse;
    },
  });

  const logsQuery = useQuery({
    queryKey: ["ai-insights", "logs"],
    queryFn: async (): Promise<InsightResponse> => {
      const res = await fetch("/api/system/logs/insights?limit=10");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load log insights.");
      }
      return (await res.json()) as InsightResponse;
    },
  });

  const runAnalyticsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/analytics/insights", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { insight?: AiInsightRecord; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to generate analytics insight.");
      }
      return data?.insight ?? null;
    },
    onSuccess: () => {
      toast("AI analytics insight generated.", { variant: "success" });
      void analyticsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast(error instanceof Error ? error.message : "Failed to generate analytics insight.", { variant: "error" });
    },
  });

  const runLogsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system/logs/insights", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { insight?: AiInsightRecord; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to generate log insight.");
      }
      return data?.insight ?? null;
    },
    onSuccess: () => {
      toast("AI log insight generated.", { variant: "success" });
      void logsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast(error instanceof Error ? error.message : "Failed to generate log insight.", { variant: "error" });
    },
  });

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="AI Insights"
        description="Aggregated AI summaries for analytics and system logs."
        className="mb-6"
        actions={(
          <Button variant="outline" size="sm" onClick={() => window.location.assign("/admin/settings/ai")}>
            Settings
          </Button>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Analytics Insights</h2>
              <p className="text-xs text-gray-400">Interaction anomalies, traffic changes, and warnings.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runAnalyticsMutation.mutate()}
              disabled={runAnalyticsMutation.isPending}
            >
              {runAnalyticsMutation.isPending ? "Running..." : "Run"}
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {analyticsQuery.isLoading ? (
              <div className="text-xs text-gray-400">Loading insights…</div>
            ) : analyticsQuery.error ? (
              <div className="text-xs text-red-400">{analyticsQuery.error.message}</div>
            ) : (analyticsQuery.data?.insights?.length ?? 0) === 0 ? (
              <div className="text-xs text-gray-500">No insights yet.</div>
            ) : (
              analyticsQuery.data?.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            )}
          </div>
        </SectionPanel>

        <SectionPanel className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Log Insights</h2>
              <p className="text-xs text-gray-400">Error patterns, regressions, and suggested fixes.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runLogsMutation.mutate()}
              disabled={runLogsMutation.isPending}
            >
              {runLogsMutation.isPending ? "Running..." : "Run"}
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {logsQuery.isLoading ? (
              <div className="text-xs text-gray-400">Loading insights…</div>
            ) : logsQuery.error ? (
              <div className="text-xs text-red-400">{logsQuery.error.message}</div>
            ) : (logsQuery.data?.insights?.length ?? 0) === 0 ? (
              <div className="text-xs text-gray-500">No insights yet.</div>
            ) : (
              logsQuery.data?.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
