import { AdminPlaywrightLiveScripterPage } from '@/features/playwright/public';
import { type JSX, Suspense } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminPlaywrightLiveScripterPage />
    </Suspense>
  );
}
