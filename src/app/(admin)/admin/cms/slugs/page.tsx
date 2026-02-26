import { JSX, Suspense } from 'react';

import { SlugsPage } from '@/features/cms/public';
import { LoadingState } from '@/shared/ui';

export default function Page(): JSX.Element {
  return (
    <Suspense
      fallback={<LoadingState message='Loading slugs...' className='h-64' />}
    >
      <SlugsPage />
    </Suspense>
  );
}
