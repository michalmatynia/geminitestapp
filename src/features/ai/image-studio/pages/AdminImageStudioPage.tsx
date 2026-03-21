'use client';

import React from 'react';

import { LoadingPanel } from '@/shared/ui/LoadingPanel';

const LazyAdminImageStudioPage = React.lazy(() =>
  import('./AdminImageStudioPageView').then((mod) => ({
    default: mod.AdminImageStudioPage,
  }))
);

export function AdminImageStudioPage(): React.JSX.Element {
  return (
    <React.Suspense
      fallback={<LoadingPanel>Loading image studio...</LoadingPanel>}
    >
      <LazyAdminImageStudioPage />
    </React.Suspense>
  );
}
