import { AdminRouteLoading } from '@/features/admin/public';
import { JSX, Suspense } from 'react';

import { SystemLogsPage } from '@/features/observability/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <SystemLogsPage />
    </Suspense>
  );
}
