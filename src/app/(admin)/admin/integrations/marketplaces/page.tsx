import { AdminRouteLoading } from '@/features/admin/public';
import { type JSX, Suspense } from 'react';

import { MarketplacesPage } from '@/features/integrations/admin.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <MarketplacesPage />
    </Suspense>
  );
}
