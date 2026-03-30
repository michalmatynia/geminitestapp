import { JSX, Suspense } from 'react';

import { MarketplacesPage } from '@/features/integrations/public';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <MarketplacesPage />
    </Suspense>
  );
}
