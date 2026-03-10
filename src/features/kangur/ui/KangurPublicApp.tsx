
import {
  getKangurHomeHref,
  resolveKangurFeaturePageRoute,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurPublicErrorBoundary } from '@/features/kangur/ui/KangurPublicErrorBoundary';
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
  const isEmbedded = embedded;

  return (
    <KangurSurfaceClassSync>
      <KangurPublicErrorBoundary homeHref={homeHref}>
        <KangurRoutingProvider
          pageKey={pageKey}
          requestedPath={requestedPath}
          basePath={normalizedBasePath}
          embedded={isEmbedded}
        >
          <KangurFeaturePageShell />
        </KangurRoutingProvider>
      </KangurPublicErrorBoundary>
    </KangurSurfaceClassSync>
  );
}
