import { AdminRouteLoading } from '@/features/admin/public';
import { type JSX, Suspense } from 'react';

import { AdminPlaywrightAiSettingsPage } from '@/features/playwright/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminPlaywrightAiSettingsPage />
    </Suspense>
  );
}
