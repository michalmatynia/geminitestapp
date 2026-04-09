import { AdminRouteLoading } from '@/features/admin/public';
import { JSX, Suspense } from 'react';

import { ConnectionsPage } from '@/features/integrations/pages.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <ConnectionsPage />
    </Suspense>
  );
}
