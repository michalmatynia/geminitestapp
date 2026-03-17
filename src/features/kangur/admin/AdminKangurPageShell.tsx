'use client';

import React from 'react';

import { resolveKangurFeaturePageRoute } from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';

import { KangurAdminMenuToggle } from './KangurAdminMenuToggle';

const KANGUR_ADMIN_BASE_PATH = '/admin/kangur';
const LazyKangurFeaturePageShell = React.lazy(() =>
  import('@/features/kangur/ui/KangurFeaturePage').then((mod) => ({
    default: mod.KangurFeaturePageShell,
  }))
);

export function AdminKangurPageShell({ slug = [] }: { slug?: string[] }): React.JSX.Element {
  const { normalizedBasePath, pageKey, requestedPath } = resolveKangurFeaturePageRoute(
    slug,
    KANGUR_ADMIN_BASE_PATH
  );

  return (
    <>
      <KangurAdminMenuToggle />
      <KangurRoutingProvider
        pageKey={pageKey}
        requestedPath={requestedPath}
        requestedHref={requestedPath}
        basePath={normalizedBasePath}
        embedded
      >
        <React.Suspense
          fallback={
            <div className='min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground'>
              Loading Kangur workspace...
            </div>
          }
        >
          <LazyKangurFeaturePageShell />
        </React.Suspense>
      </KangurRoutingProvider>
    </>
  );
}
