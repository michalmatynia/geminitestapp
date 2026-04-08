import { AdminRouteLoading } from '@/features/admin/public';
import { JSX, Suspense } from 'react';

import { PlaywrightPersonasPage } from '@/features/playwright/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <PlaywrightPersonasPage />
    </Suspense>
  );
}
