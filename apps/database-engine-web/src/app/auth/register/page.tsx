import { Suspense } from 'react';

import RegisterPage from '../../../auth/pages/public/RegisterPage';

export default function Page(): React.JSX.Element {
  return (
    <Suspense fallback={<></>}>
      <RegisterPage />
    </Suspense>
  );
}
