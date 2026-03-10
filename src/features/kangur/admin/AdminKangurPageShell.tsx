'use client';

import {
  KangurFeaturePageShell,
  resolveKangurFeaturePageRoute,
} from '@/features/kangur/ui/KangurFeaturePage';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';

import { KangurAdminMenuToggle } from './KangurAdminMenuToggle';

const KANGUR_ADMIN_BASE_PATH = '/admin/kangur';

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
        basePath={normalizedBasePath}
        embedded
      >
        <KangurFeaturePageShell />
      </KangurRoutingProvider>
    </>
  );
}
