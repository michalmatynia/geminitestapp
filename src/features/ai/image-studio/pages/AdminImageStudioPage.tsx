'use client';

import React from 'react';

const LazyAdminImageStudioPage = React.lazy(() =>
  import('./AdminImageStudioPageView').then((mod) => ({
    default: mod.AdminImageStudioPage,
  }))
);

export function AdminImageStudioPage(): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className='min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground'>
          Loading image studio...
        </div>
      }
    >
      <LazyAdminImageStudioPage />
    </React.Suspense>
  );
}
