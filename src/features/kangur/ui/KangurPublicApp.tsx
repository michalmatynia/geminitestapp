import {
  getKangurHomeHref,
  resolveKangurFeaturePageRoute,
} from '@/features/kangur/config/routing';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { KangurPublicErrorBoundary } from '@/features/kangur/ui/KangurPublicErrorBoundary';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/appearance/storefront-appearance-settings';

import type { JSX } from 'react';

export function KangurPublicApp({
  slug = [],
  basePath = '/',
  embedded = false,
  initialAppearance,
}: {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
  initialAppearance?: {
    mode?: KangurStorefrontAppearanceMode;
    themeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
  };
}): JSX.Element {
  const {
    normalizedBasePath,
    pageKey,
    requestedPath,
  } = resolveKangurFeaturePageRoute(slug, basePath);
  const homeHref = getKangurHomeHref(normalizedBasePath);
  const isEmbedded = embedded;

  return (
    <KangurStorefrontAppearanceProvider
      initialAppearance={initialAppearance}
    >
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
