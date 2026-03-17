
import {
  getKangurHomeHref,
  resolveKangurFeaturePageRoute,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurPublicErrorBoundary } from '@/features/kangur/ui/KangurPublicErrorBoundary';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/storefront-appearance-settings';

import type { JSX } from 'react';

export function KangurPublicApp({
  slug = [],
  basePath = '/',
  embedded = false,
  initialMode,
}: {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
  initialMode?: KangurStorefrontAppearanceMode;
}): JSX.Element {
  const { normalizedBasePath, pageKey, requestedPath } = resolveKangurFeaturePageRoute(
    slug,
    basePath
  );
  const homeHref = getKangurHomeHref(normalizedBasePath);
  const isEmbedded = embedded;

  return (
    <KangurStorefrontAppearanceProvider initialMode={initialMode}>
      <KangurSurfaceClassSync>
        <KangurPublicErrorBoundary homeHref={homeHref}>
          <KangurRoutingProvider
            pageKey={pageKey}
            requestedPath={requestedPath}
            requestedHref={requestedPath}
            basePath={normalizedBasePath}
            embedded={isEmbedded}
          >
            <KangurFeaturePageShell />
          </KangurRoutingProvider>
        </KangurPublicErrorBoundary>
      </KangurSurfaceClassSync>
    </KangurStorefrontAppearanceProvider>
  );
}
