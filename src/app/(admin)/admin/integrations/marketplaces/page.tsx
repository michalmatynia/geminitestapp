import { AdminRouteLoading } from '@/features/admin/public';
import { JSX, Suspense } from 'react';

import { MarketplacesPage } from '@/features/integrations/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <MarketplacesPage />
    </Suspense>
  );
}
