import { Suspense } from 'react';

import SignInPage from '../../../auth/pages/public/SignInPage';

export default function Page(): React.JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <SignInPage />
    </Suspense>
  );
}
