import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';

import { AuthProvider } from '../../auth/context/AuthContext';

import type { ReactNode } from 'react';

export default function DatabaseEngineAuthLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <AuthProvider mode='public'>
      <SkipToContentLink />
      <main
        id='database-engine-auth-content'
        tabIndex={-1}
        className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      >
        <QueryErrorBoundary>{children}</QueryErrorBoundary>
      </main>
    </AuthProvider>
  );
}
