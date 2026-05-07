import { AuthProvider } from '@/features/auth/context/AuthContext';
import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';

import type { ReactNode } from 'react';

export default function CmsBuilderAuthLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <AuthProvider mode='public'>
      <SkipToContentLink />
      <main
        id='cms-builder-auth-content'
        tabIndex={-1}
        className='min-h-screen bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      >
        <QueryErrorBoundary>{children}</QueryErrorBoundary>
      </main>
    </AuthProvider>
  );
}
