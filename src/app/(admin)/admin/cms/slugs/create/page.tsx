import { JSX, Suspense } from 'react';

import { CreateSlugPage } from '@/features/cms/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateSlugPage />
    </Suspense>
  );
}
