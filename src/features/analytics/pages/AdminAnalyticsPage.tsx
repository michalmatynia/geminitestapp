"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { AnalyticsScope, AnalyticsSummaryDto } from "@/shared/types";
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
} from "@/shared/ui";
import { cn } from "@/shared/utils";
import { fetchAnalyticsSummary, type AnalyticsRange } from "../api";

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

  const summaryQuery = useQuery({
    queryKey: ["analytics", "summary", range, scope],
    queryFn: () => fetchAnalyticsSummary({ range, scope }),
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
            <label className="flex items-center gap-2 text-xs text-gray-400">
              Scope
              <select
                value={scope}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>): void =>
                  setScope(event.target.value as AnalyticsScope | "all")
                }
                className="h-9 rounded-md border border-border bg-gray-900/40 px-2 text-sm text-white"
              >
                {scopes.map((option: { value: AnalyticsScope | "all"; label: string }) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-400">
              Range
              <select
                value={range}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>): void =>
                  setRange(event.target.value as AnalyticsRange)
                }
                className="h-9 rounded-md border border-border bg-gray-900/40 px-2 text-sm text-white"
              >
                {ranges.map((option: { value: AnalyticsRange; label: string }) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

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
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event: NonNullable<AnalyticsSummaryDto["recent"]>[number]) => (
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

