import { AdminRouteLoading } from '@/features/admin/public';
import { type JSX, Suspense } from 'react';

import SystemLogsPage from '@/shared/lib/observability/components/system-logs/SystemLogsPage';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <SystemLogsPage />
    </Suspense>
  );
}
