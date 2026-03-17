'use client';

import React from 'react';

const LazyRootProviders = React.lazy(() =>
  import('./RootProviders').then((mod) => ({ default: mod.RootProviders }))
);

export function RootClientShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className='min-h-screen bg-background p-6 text-sm text-muted-foreground'>
          Loading app...
        </div>
      }
    >
      <LazyRootProviders>{children}</LazyRootProviders>
    </React.Suspense>
  );
}
