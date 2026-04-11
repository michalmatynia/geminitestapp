import { JSX, Suspense } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';
import { Admin3DAssetsPage } from '@/features/viewer3d/pages.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <Admin3DAssetsPage />
    </Suspense>
  );
}
