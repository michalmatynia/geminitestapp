
import { getKangurHomeHref } from '@/features/kangur/config/routing';
import {
  KangurFeaturePageShell,
  resolveKangurFeaturePageRoute,
} from '@/features/kangur/ui/KangurFeaturePage';
import { KangurPublicErrorBoundary } from '@/features/kangur/ui/KangurPublicErrorBoundary';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { JSX } from 'react';

export function KangurPublicApp({
  slug = [],
  basePath = '/',
  embedded = false,
}: {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
}): JSX.Element {
  const { normalizedBasePath, pageKey, requestedPath } = resolveKangurFeaturePageRoute(
    slug,
    basePath
  );
  const homeHref = getKangurHomeHref(normalizedBasePath);

  return (
    <KangurSurfaceClassSync>
      <KangurPublicErrorBoundary homeHref={homeHref}>
        <KangurRoutingProvider
          pageKey={pageKey}
          requestedPath={requestedPath}
          basePath={normalizedBasePath}
          embedded={embedded}
        >
          <KangurFeaturePageShell />
        </KangurRoutingProvider>
      </KangurPublicErrorBoundary>
    </KangurSurfaceClassSync>
  );
}
