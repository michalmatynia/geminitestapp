import { JSX, Suspense } from 'react';

import { SlugsPage } from '@/features/cms';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SlugsPage />
    </Suspense>
  );
}
