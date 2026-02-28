import { JSX, Suspense } from 'react';

import { MarketplacesPage } from '@/shared/lib/integrations/public';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <MarketplacesPage />
    </Suspense>
  );
}
