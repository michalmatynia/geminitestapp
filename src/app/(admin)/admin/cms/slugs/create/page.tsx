import { type JSX, Suspense } from 'react';

import { CreateSlugPage } from '@/features/cms/public';
import { LoadingState } from '@/shared/ui/LoadingState';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Loading editor...' className='h-64' />}>
      <CreateSlugPage />
    </Suspense>
  );
}
