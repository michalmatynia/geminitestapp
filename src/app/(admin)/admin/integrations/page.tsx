import { JSX, Suspense } from 'react';

import ConnectionsPage from '@/features/integrations/pages/ConnectionsPage';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <ConnectionsPage />
    </Suspense>
  );
}
