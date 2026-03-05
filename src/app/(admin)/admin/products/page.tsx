import { JSX, Suspense } from 'react';

import { AdminProductsPage } from '@/features/products/';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <AdminProductsPage />
    </Suspense>
  );
}
