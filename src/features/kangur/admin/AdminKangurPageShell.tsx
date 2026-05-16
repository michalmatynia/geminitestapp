import React from 'react';

import {
  resolveKangurFeaturePageRoute,
} from '@/features/kangur/config/routing';
import {
  primeKangurAuthBootstrapCache,
  readKangurAuthBootstrapCache,
} from '@/features/kangur/ui/context/kangur-auth-bootstrap-cache';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { LoadingPanel } from '@/shared/ui/LoadingPanel';

import { KangurAdminErrorBoundary } from './KangurAdminErrorBoundary';
import { KangurAdminMenuToggle } from './KangurAdminMenuToggle';

// Prime the auth bootstrap cache with null (unauthenticated) before the
// KangurAuthProvider mounts in the admin embed. This bypasses the 1.5 s
// auth-check network call on every cold page load. The guard ensures an
// existing active learner session (within its 30 s TTL) is never overwritten.
// The `typeof window` check confines this to the browser; server-side module
// evaluation is skipped so the shared server module cache is not polluted.
if (typeof window !== 'undefined' && typeof readKangurAuthBootstrapCache() === 'undefined') {
  primeKangurAuthBootstrapCache(null);
}

const KANGUR_ADMIN_BASE_PATH = '/admin/kangur';
const LazyKangurFeaturePageShell = React.lazy(() =>
  import('@/features/kangur/ui/KangurFeaturePage').then((mod) => ({
    default: mod.KangurFeaturePageShell,
  }))
);

export function AdminKangurPageShell({
  basePath = KANGUR_ADMIN_BASE_PATH,
  slug = [],
}: {
  basePath?: string;
  slug?: string[];
}): React.JSX.Element {
  const {
    normalizedBasePath,
    pageKey,
    requestedPath,
  } = resolveKangurFeaturePageRoute(slug, basePath);

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
        <KangurAdminErrorBoundary>
          <SettingsStoreProvider mode='lite' suppressOwnQuery>
            <React.Suspense
              fallback={<LoadingPanel>Loading workspace...</LoadingPanel>}
            >
              <LazyKangurFeaturePageShell />
            </React.Suspense>
          </SettingsStoreProvider>
        </KangurAdminErrorBoundary>
      </KangurRoutingProvider>
    </>
  );
}
