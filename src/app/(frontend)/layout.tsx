import { QueryErrorBoundary } from '@/shared/ui/QueryErrorBoundary';

import type { JSX } from 'react';

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className='min-h-screen bg-background'>
      <QueryErrorBoundary>{children}</QueryErrorBoundary>
    </div>
  );
}
