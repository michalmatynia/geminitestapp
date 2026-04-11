import { JSX, Suspense } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';
import { TraderaParameterMappingPage } from '@/features/integrations/admin.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <TraderaParameterMappingPage />
    </Suspense>
  );
}
