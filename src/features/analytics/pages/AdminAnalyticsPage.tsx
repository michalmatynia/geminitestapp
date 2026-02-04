"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import type { AnalyticsScope, AnalyticsSummaryDto, AiInsightRecord } from "@/shared/types";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SectionHeader,
  SectionPanel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { cn } from "@/shared/utils";
import { fetchAnalyticsSummary, type AnalyticsRange } from "../api";
import { useToast } from "@/shared/ui";

const ranges: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const scopes: Array<{ value: AnalyticsScope | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "admin", label: "Admin" },
];

const formatCount = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch {
    return String(value);
  }
};

export default function AdminAnalyticsPage(): React.JSX.Element {
  const [range, setRange] = useState<AnalyticsRange>("24h");
  const [scope, setScope] = useState<AnalyticsScope | "all">("all");
  const { toast } = useToast();

  const summaryQuery = useQuery({
    queryKey: ["analytics", "summary", range, scope],
    queryFn: () => fetchAnalyticsSummary({ range, scope }),
  });

  const insightsQuery = useQuery({
    queryKey: ["analytics", "insights"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/insights?limit=5");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load AI insights.");
      }
      return (await res.json()) as { insights: AiInsightRecord[] };
    },
  });

  const runInsightMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/analytics/insights", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { insight?: AiInsightRecord; error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to generate insight.");
      }
      return data?.insight ?? null;
    },
    onSuccess: (insight: AiInsightRecord | null) => {
      if (insight) {
        toast("AI analytics insight generated.", { variant: "success" });
        void insightsQuery.refetch();
      }
    },
    onError: (error: unknown) => {
      toast(error instanceof Error ? error.message : "Failed to generate insight.", { variant: "error" });
    },
  });

  const summary = summaryQuery.data;
  const fromToLabel = useMemo((): string | null => {
    if (!summary) return null;
    try {
      const from = new Date(summary.from).toLocaleString();
      const to = new Date(summary.to).toLocaleString();
      return `${from} → ${to}`;
    } catch {
      return null;
    }
  }, [summary]);

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Page Analytics"
        description="Traffic, referrers, languages, and recent activity."
        className="mb-6"
        actions={(
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Scope</span>
              <Select
                value={scope}
                onValueChange={(val: string): void =>
                  setScope(val as AnalyticsScope | "all")
                }
              >
                <SelectTrigger className="h-9 w-[100px] border-border bg-gray-900/40 text-sm text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopes.map((option: { value: AnalyticsScope | "all"; label: string }) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Range</span>
              <Select
                value={range}
                onValueChange={(val: string): void =>
                  setRange(val as AnalyticsRange)
                }
              >
                <SelectTrigger className="h-9 w-[130px] border-border bg-gray-900/40 text-sm text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ranges.map((option: { value: AnalyticsRange; label: string }) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={(): void => {
                void summaryQuery.refetch();
              }}
              disabled={summaryQuery.isFetching}
            >
              {summaryQuery.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </>
        )}
      />

      <div className="mb-6">
        {summaryQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading analytics…</p>
        ) : summaryQuery.error ? (
          <p className="text-sm text-red-400">
            {summaryQuery.error.message}
          </p>
        ) : fromToLabel ? (
          <p className="text-xs text-gray-500">Window: {fromToLabel}</p>
        ) : null}
      </div>

      <SectionPanel className="mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">AI Insights</h2>
            <p className="text-xs text-gray-400">
              Automated overview of interactions and possible issues.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runInsightMutation.mutate()}
            disabled={runInsightMutation.isPending}
          >
            {runInsightMutation.isPending ? "Running..." : "Run AI Insight"}
          </Button>
        </div>
        {insightsQuery.isLoading ? (
          <p className="mt-3 text-xs text-gray-500">Loading AI insights…</p>
        ) : insightsQuery.error ? (
          <p className="mt-3 text-xs text-red-400">{insightsQuery.error.message}</p>
        ) : (insightsQuery.data?.insights?.length ?? 0) === 0 ? (
          <p className="mt-3 text-xs text-gray-500">No insights yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {insightsQuery.data?.insights.map((insight: AiInsightRecord) => (
              <div key={insight.id} className="rounded-md border border-border/60 bg-gray-950/40 p-3 text-xs text-gray-300">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase text-gray-500">
                    {new Date(insight.createdAt).toLocaleString()}
                  </span>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] ${
                      insight.status === "ok"
                        ? "border-emerald-500/40 text-emerald-200"
                        : insight.status === "warning"
                          ? "border-amber-500/40 text-amber-200"
                          : "border-rose-500/40 text-rose-200"
                    }`}
                  >
                    {insight.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-white">{insight.summary}</div>
                {insight.warnings.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-200">
                    {insight.warnings.map((warning: string, index: number) => (
                      <li key={`${insight.id}-warn-${index}`}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          { label: "Pageviews", value: summary?.totals.pageviews ?? 0 },
          { label: "Events", value: summary?.totals.events ?? 0 },
          { label: "Visitors", value: summary?.visitors ?? 0 },
          { label: "Sessions", value: summary?.sessions ?? 0 },
        ] as const).map((metric: { label: string; value: number }) => (
          <Card
            key={metric.label}
            className="border-border/50 bg-gray-900/40"
          >
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-semibold text-white">
                {formatCount(metric.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionPanel className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Top Pages</h2>
          <MiniTable
            rows={(summary?.topPages ?? []).map((item: { path: string; count: number }) => ({
              key: item.path,
              left: item.path,
              right: formatCount(item.count),
            }))}
            emptyLabel="No pageviews yet."
          />
        </SectionPanel>

        <SectionPanel className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">
            Top Referrers
          </h2>
          <MiniTable
            rows={(summary?.topReferrers ?? []).map((item: { referrer: string; count: number }) => ({
              key: item.referrer,
              left: item.referrer,
              right: formatCount(item.count),
            }))}
            emptyLabel="No referrers yet."
          />
        </SectionPanel>

        <SectionPanel className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">
            Top Languages
          </h2>
          <MiniTable
            rows={(summary?.topLanguages ?? []).map((item: { language: string; count: number }) => ({
              key: item.language,
              left: item.language,
              right: formatCount(item.count),
            }))}
            emptyLabel="No language data yet."
          />
        </SectionPanel>

        <SectionPanel className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">
            Top Countries
          </h2>
          <MiniTable
            rows={(summary?.topCountries ?? []).map((item: { country: string; count: number }) => ({
              key: item.country,
              left: item.country,
              right: formatCount(item.count),
            }))}
            emptyLabel="No geo data yet."
          />
        </SectionPanel>
      </div>

      <SectionPanel className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Recent Events</h2>
        <RecentEventsTable summary={summary} />
      </SectionPanel>
    </div>
  );
}

function MiniTable(props: {
  rows: Array<{ key: string; left: string; right: string }>;
  emptyLabel: string;
}): React.JSX.Element {
  if (props.rows.length === 0) {
    return <p className="text-sm text-gray-500">{props.emptyLabel}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-2">Value</TableHead>
          <TableHead className="px-2 text-right">Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.rows.map((row: { key: string; left: string; right: string }) => (
          <TableRow key={row.key}>
            <TableCell className="px-2 py-2 text-sm text-gray-200">
              <span className="truncate">{row.left}</span>
            </TableCell>
            <TableCell className="px-2 py-2 text-right text-sm text-gray-200">
              {row.right}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RecentEventsTable(props: {
  summary: AnalyticsSummaryDto | undefined;
}): React.JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const events = props.summary?.recent ?? [];
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">No events yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-2">Time</TableHead>
          <TableHead className="px-2">Type</TableHead>
          <TableHead className="px-2">Scope</TableHead>
          <TableHead className="px-2">Path</TableHead>
          <TableHead className="px-2">Referrer</TableHead>
          <TableHead className="px-2">Country</TableHead>
          <TableHead className="px-2">IP</TableHead>
          <TableHead className="px-2 text-right">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event: NonNullable<AnalyticsSummaryDto["recent"]>[number]) => {
          const isExpanded = expandedId === event.id;
          const ipDisplay = event.ip ?? event.ipMasked ?? event.ipHash ?? "—";
          return (
            <Fragment key={event.id}>
              <TableRow key={event.id}>
                <TableCell className="px-2 py-2 text-xs text-gray-300">
                  {((): string => {
                    try {
                      return new Date(event.ts).toLocaleString();
                    } catch {
                      return event.ts;
                    }
                  })()}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-300">
                  {event.type}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-300">
                  {event.scope}
                </TableCell>
                <TableCell className={cn("px-2 py-2 text-xs text-gray-200")}>
                  {event.path}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-400">
                  {event.referrer ?? "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-400">
                  {event.country ?? "—"}
                </TableCell>
                <TableCell className="px-2 py-2 text-xs text-gray-400">
                  {ipDisplay}
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => {
                      setExpandedId(isExpanded ? null : event.id);
                    }}
                  >
                    {isExpanded ? "Hide" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
              {isExpanded ? (
                <TableRow key={`${event.id}-details`}>
                  <TableCell colSpan={8} className="bg-gray-950/40 px-3 py-4">
                    <EventDetails event={event} />
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function EventDetails(props: { event: NonNullable<AnalyticsSummaryDto["recent"]>[number] }): React.JSX.Element {
  const { event } = props;
  const screenValue = event.screen
    ? `${event.screen.width}×${event.screen.height} @ ${event.screen.dpr}x`
    : "—";
  const viewportValue = event.viewport
    ? `${event.viewport.width}×${event.viewport.height}`
    : "—";
  const languageValue = event.languages?.length
    ? event.languages.join(", ")
    : event.language ?? "—";
  const connectionValue = event.connection
    ? `${event.connection.effectiveType ?? "n/a"} • ${event.connection.downlink ?? "?"} Mbps • ${event.connection.rtt ?? "?"} ms`
    : "—";
  const ipDisplay = event.ip ?? event.ipMasked ?? event.ipHash ?? "—";

  return (
    <div className="grid gap-3 text-xs text-gray-300 md:grid-cols-2">
      <DetailItem label="IP" value={ipDisplay} />
      <DetailItem label="User Agent" value={event.userAgent ?? "—"} />
      <DetailItem label="Visitor ID" value={event.visitorId} />
      <DetailItem label="Session ID" value={event.sessionId} />
      <DetailItem label="Client Time" value={event.clientTs ?? "—"} />
      <DetailItem label="Timezone" value={event.timeZone ?? "—"} />
      <DetailItem label="Languages" value={languageValue} />
      <DetailItem label="Viewport" value={viewportValue} />
      <DetailItem label="Screen" value={screenValue} />
      <DetailItem label="Connection" value={connectionValue} />
      <DetailItem label="Region" value={event.region ?? "—"} />
      <DetailItem label="City" value={event.city ?? "—"} />
      <DetailItem label="UTM" value={event.utm ? JSON.stringify(event.utm) : "—"} />
      <DetailItem label="Meta" value={event.meta ? JSON.stringify(event.meta) : "—"} />
    </div>
  );
}

function DetailItem(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">
        {props.label}
      </span>
      <span className="break-all text-gray-200">{props.value}</span>
    </div>
  );
}
