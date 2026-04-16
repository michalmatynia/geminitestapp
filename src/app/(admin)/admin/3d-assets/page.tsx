import { type JSX, Suspense } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';
import { Admin3DAssetsPage } from '@/features/viewer3d/admin.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <Admin3DAssetsPage />
    </Suspense>
  );
}
