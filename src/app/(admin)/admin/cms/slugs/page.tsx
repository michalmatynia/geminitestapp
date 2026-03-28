import { JSX, Suspense } from 'react';

import SlugsPage from '@/features/cms/pages/slugs/SlugsPage';
import { LoadingState } from '@/shared/ui/LoadingState';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Loading slugs...' className='h-64' />}>
      <SlugsPage />
    </Suspense>
  );
}
