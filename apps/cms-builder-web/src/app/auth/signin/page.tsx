import { Suspense } from 'react';

import SignInPage from '@/features/auth/pages/public/SignInPage';

export default function Page(): React.JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <SignInPage />
    </Suspense>
  );
}
