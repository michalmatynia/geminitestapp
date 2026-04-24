import { Suspense, type JSX } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';
import { AdminPlaywrightScriptersPageView } from '@/features/playwright/scripters/components/AdminPlaywrightScriptersPageView';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminPlaywrightScriptersPageView />
    </Suspense>
  );
}
