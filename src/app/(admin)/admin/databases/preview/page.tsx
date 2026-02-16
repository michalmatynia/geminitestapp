import { JSX, Suspense } from 'react';

import { DatabasePreviewPage } from '@/features/database/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <DatabasePreviewPage />
    </Suspense>
  );
}
