import { type JSX, Suspense } from 'react';

import { AdminRouteLoading } from '@/features/admin/public';
import { Asset3DListPage } from '@/features/viewer3d/admin.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<AdminRouteLoading />}>
      <Asset3DListPage />
    </Suspense>
  );
}
