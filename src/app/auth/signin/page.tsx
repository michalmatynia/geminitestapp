import { type JSX, Suspense } from 'react';

import { SignInPage } from '@/features/auth/public';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <SignInPage />
    </Suspense>
  );
}
