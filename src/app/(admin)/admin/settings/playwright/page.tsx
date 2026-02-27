import { JSX, Suspense } from 'react';

import { PlaywrightPersonasPage } from '@/shared/lib/playwright/public';

export const dynamic = 'force-dynamic';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <PlaywrightPersonasPage />
    </Suspense>
  );
}
