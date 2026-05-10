'use client';

import dynamic from 'next/dynamic';
import { type JSX, useState } from 'react';

import { useHealthStatus } from '@/shared/hooks/useHealthStatus';
import { useSystemActivity } from '@/shared/hooks/useSystemActivity';

import { AdminPageLayout } from '@/shared/ui/AdminPageLayout';
import { ADMIN_DASHBOARD_SECTION } from '@/features/admin/constants/admin-menu-settings';

const SystemHealthPanel = dynamic(
  () => import('./dashboard-panels').then((mod) => mod.SystemHealthPanel),
  { ssr: false }
);

const RecentActivityPanel = dynamic(
  () => import('./dashboard-panels').then((mod) => mod.RecentActivityPanel),
  { ssr: false }
);

const QuickAccessPanel = dynamic(
  () => import('./dashboard-panels').then((mod) => mod.QuickAccessPanel),
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
    <AdminPageLayout
      section={ADMIN_DASHBOARD_SECTION}
      current='Dashboard'
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
    </AdminPageLayout>
  );
}
