import { JSX, Suspense } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';
import { TraderaParameterMappingPage } from '@/features/integrations/public';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <TraderaParameterMappingPage />
    </Suspense>
  );
}
