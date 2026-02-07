'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

import { useAnalytics } from '../context/AnalyticsContext';

const formatCount = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch {
    return String(value);
  }
};

export function AnalyticsMetricsGrid(): React.JSX.Element {
  const { summaryQuery } = useAnalytics();
  const summary = summaryQuery.data;

  const metrics = [
    { label: 'Pageviews', value: summary?.totals.pageviews ?? 0 },
    { label: 'Events', value: summary?.totals.events ?? 0 },
    { label: 'Visitors', value: summary?.visitors ?? 0 },
    { label: 'Sessions', value: summary?.sessions ?? 0 },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
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
  );
}
