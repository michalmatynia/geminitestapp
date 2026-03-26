'use client';

import React from 'react';

import {
  KANGUR_MAIN_PAGE_KEY,
} from '@/features/kangur/config/routing';
import {
  resolveAccessibleKangurFeaturePageRoute,
} from '@/features/kangur/config/page-access';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import { LoadingPanel } from '@/shared/ui/LoadingPanel';

import { KangurAdminMenuToggle } from './KangurAdminMenuToggle';

const KANGUR_ADMIN_BASE_PATH = '/admin/kangur';
const LazyKangurFeaturePageShell = React.lazy(() =>
  import('@/features/kangur/ui/KangurFeaturePage').then((mod) => ({
    default: mod.KangurFeaturePageShell,
  }))
);

export function AdminKangurPageShell({ slug = [] }: { slug?: string[] }): React.JSX.Element {
  const { data: session } = useOptionalNextAuthSession();
  const {
    normalizedBasePath,
    pageKey: accessiblePageKey,
    requestedPath: accessibleRequestedPath,
  } = resolveAccessibleKangurFeaturePageRoute({
    slug,
    basePath: KANGUR_ADMIN_BASE_PATH,
    session,
    fallbackPageKey: KANGUR_MAIN_PAGE_KEY,
  });

  return (
    <>
      <KangurAdminMenuToggle />
      <KangurRoutingProvider
        pageKey={accessiblePageKey}
        requestedPath={accessibleRequestedPath}
        requestedHref={accessibleRequestedPath}
        basePath={normalizedBasePath}
        embedded
      >
        <React.Suspense
          fallback={<LoadingPanel>Loading Kangur workspace...</LoadingPanel>}
        >
          <LazyKangurFeaturePageShell />
        </React.Suspense>
      </KangurRoutingProvider>
    </>
  );
}
