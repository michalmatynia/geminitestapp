'use client';

import { FormSection } from '@/shared/ui';

import { AnalyticsAiInsights } from '../components/AnalyticsAiInsights';
import { AnalyticsDashboardHeader } from '../components/AnalyticsDashboardHeader';
import { AnalyticsMetricsGrid } from '../components/AnalyticsMetricsGrid';
import { AnalyticsTopStats } from '../components/AnalyticsTopStats';
import { RecentEventsTable } from '../components/RecentEventsTable';
import { AnalyticsProvider } from '../context/AnalyticsContext';

function AnalyticsPageContent(): React.JSX.Element {
  return (
    <div className='container mx-auto py-10'>
      <AnalyticsDashboardHeader />
      <AnalyticsAiInsights />
      <AnalyticsMetricsGrid />
      <AnalyticsTopStats />

      <FormSection title='Recent Events' className='mt-6'>
        <RecentEventsTable />
      </FormSection>
    </div>
  );
}

export default function AdminAnalyticsPage(): React.JSX.Element {
  return (
    <AnalyticsProvider>
      <AnalyticsPageContent />
    </AnalyticsProvider>
  );
}
