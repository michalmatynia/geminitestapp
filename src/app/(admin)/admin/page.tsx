'use client';
import { JSX, useState } from 'react';

import { useSystemActivity } from '@/features/observability/hooks/useLogQueries';
import { useHealthStatus } from '@/shared/hooks/useHealthStatus';

import {
  QuickAccessPanel,
  RecentActivityPanel,
  SystemHealthPanel,
} from './dashboard-panels';

export default function AdminDashboard(): JSX.Element {
  const [recentActivityOpen, setRecentActivityOpen] = useState(true);
  const { data, isLoading, error } = useHealthStatus();
  const { data: activityData, isLoading: activityLoading } = useSystemActivity({ pageSize: 5 });
  const activity = activityData?.data ?? [];

  return (
    <div className='container mx-auto py-10'>
      <h1 className='text-3xl font-bold mb-6'>Dashboard</h1>
      <div className='space-y-4'>
        <QuickAccessPanel />
        <SystemHealthPanel
          isLoading={isLoading}
          errorMessage={error?.message ?? null}
          isHealthy={data ? data.ok : null}
        />
        <RecentActivityPanel
          isOpen={recentActivityOpen}
          onOpenChange={setRecentActivityOpen}
          isLoading={activityLoading}
          activity={activity}
        />
      </div>
    </div>
  );
}
