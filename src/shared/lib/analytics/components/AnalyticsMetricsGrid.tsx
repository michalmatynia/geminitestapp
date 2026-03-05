'use client';

import { MetadataItem } from '@/shared/ui';

import { useAnalyticsSummaryData } from '../context/AnalyticsContext';

const formatCount = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch {
    return String(value);
  }
};

export function AnalyticsMetricsGrid(): React.JSX.Element {
  const { summaryQuery } = useAnalyticsSummaryData();
  const summary = summaryQuery.data;

  const metrics = [
    { label: 'Pageviews', value: summary?.totals.pageviews ?? 0 },
    { label: 'Events', value: summary?.totals.events ?? 0 },
    { label: 'Visitors', value: summary?.visitors ?? 0 },
    { label: 'Sessions', value: summary?.sessions ?? 0 },
  ] as const;

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {metrics.map((metric) => (
        <MetadataItem
          key={metric.label}
          label={metric.label}
          value={formatCount(metric.value)}
          valueClassName='text-2xl font-semibold text-white mt-1'
          className='p-4'
        />
      ))}
    </div>
  );
}
