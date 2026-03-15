'use client';

import React from 'react';

import { AnalyticsStatCard } from './AnalyticsStatCard';
import { useAnalyticsSummaryData } from '../context/AnalyticsContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const formatCount = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch (error) {
    logClientError(error);
    return String(value);
  }
};

export function AnalyticsTopStats(): React.JSX.Element {
  const { summaryQuery } = useAnalyticsSummaryData();
  const summary = summaryQuery.data;

  return (
    <div className='mt-6 grid gap-6 lg:grid-cols-2'>
      <AnalyticsStatCard
        title='Top Pages'
        rows={(summary?.topPages ?? []).map((item) => ({
          key: item.path,
          left: item.path,
          right: formatCount(item.count),
        }))}
        emptyLabel='No pageviews yet.'
      />

      <AnalyticsStatCard
        title='Top Referrers'
        rows={(summary?.topReferrers ?? []).map((item) => ({
          key: item.referrer,
          left: item.referrer,
          right: formatCount(item.count),
        }))}
        emptyLabel='No referrers yet.'
      />

      <AnalyticsStatCard
        title='Top Languages'
        rows={(summary?.topLanguages ?? []).map((item) => ({
          key: item.language,
          left: item.language,
          right: formatCount(item.count),
        }))}
        emptyLabel='No language data yet.'
      />

      <AnalyticsStatCard
        title='Top Countries'
        rows={(summary?.topCountries ?? []).map((item) => ({
          key: item.country,
          left: item.country,
          right: formatCount(item.count),
        }))}
        emptyLabel='No geo data yet.'
      />
    </div>
  );
}
