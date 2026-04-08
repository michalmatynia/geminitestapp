'use client';

import dynamic from 'next/dynamic';
import { JSX, useState } from 'react';

import { useHealthStatus } from '@/shared/hooks/useHealthStatus';
import { useSystemActivity } from '@/shared/hooks/useSystemActivity';
import { PageLayout } from '@/shared/ui/navigation-and-layout.public';

import { QuickAccessPanel } from './dashboard-panels';

const SystemHealthPanel = dynamic(
  () => import('./dashboard-panels').then((mod) => mod.SystemHealthPanel),
  { ssr: false }
);

const RecentActivityPanel = dynamic(
  () => import('./dashboard-panels').then((mod) => mod.RecentActivityPanel),
  { ssr: false }
);

export default function AdminDashboardPage(): JSX.Element {
  const [recentActivityOpen, setRecentActivityOpen] = useState(true);
  const { data, isLoading, error } = useHealthStatus();
  const { data: activityData, isLoading: activityLoading } = useSystemActivity({
    pageSize: 5,
  });
  const activity = activityData?.data ?? [];

  return (
    <PageLayout
      title='Dashboard'
      description='System overview and quick access to administrative tools.'
    >
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
    </PageLayout>
  );
}
