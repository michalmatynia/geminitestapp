import { JSX, Suspense } from 'react';

import { AdminProductsPage } from '@/features/products/pages/AdminProductsPage';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <AdminProductsPage />
    </Suspense>
  );
}
