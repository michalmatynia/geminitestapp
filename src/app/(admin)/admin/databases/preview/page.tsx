import { AdminRouteLoading } from '@/features/admin/public';
import { type JSX, Suspense } from 'react';

import { DatabasePreviewPage } from '@/features/database/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <DatabasePreviewPage />
    </Suspense>
  );
}
