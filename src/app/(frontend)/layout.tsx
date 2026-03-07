import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';

export default function FrontendLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <main id='app-content' tabIndex={-1} className='min-h-screen bg-background focus:outline-none'>
      <QueryErrorBoundary>{children}</QueryErrorBoundary>
    </main>
  );
}
