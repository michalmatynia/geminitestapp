import { AdminPlaywrightStepSequencerPage } from '@/features/playwright/public';
import { JSX, Suspense } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <AdminPlaywrightStepSequencerPage />
    </Suspense>
  );
}
