'use client';

import { SectionPanel } from '@/shared/ui';

import { AnalyticsAiInsights } from '../components/AnalyticsAiInsights';
import { AnalyticsDashboardHeader } from '../components/AnalyticsDashboardHeader';
import { AnalyticsMetricsGrid } from '../components/AnalyticsMetricsGrid';
import { AnalyticsTopStats } from '../components/AnalyticsTopStats';
import { RecentEventsTable } from '../components/RecentEventsTable';
import { AnalyticsProvider } from '../context/AnalyticsContext';

function AnalyticsPageContent(): React.JSX.Element {
  return (
    <div className="container mx-auto py-10">
      <AnalyticsDashboardHeader />
      <AnalyticsAiInsights />
      <AnalyticsMetricsGrid />
      <AnalyticsTopStats />

      <SectionPanel className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Recent Events</h2>
        <RecentEventsTable />
      </SectionPanel>
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