import { AdminRouteLoading } from '@/features/admin/layout/AdminRouteLoading';
import { JSX, Suspense } from 'react';

import SystemLogsPage from '@/features/observability/pages/SystemLogsPage';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <SystemLogsPage />
    </Suspense>
  );
}
