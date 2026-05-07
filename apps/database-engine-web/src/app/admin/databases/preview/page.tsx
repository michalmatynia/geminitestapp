import { type JSX, Suspense } from 'react';

import { DatabasePreviewPage } from '@/features/database/public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<LoadingState message='Loading database preview...' />}>
      <DatabasePreviewPage />
    </Suspense>
  );
}
