
import '@/app/(frontend)/kangur/kangur.css';

import {
  KANGUR_MAIN_PAGE_KEY,
  getKangurHomeHref,
} from '@/features/kangur/config/routing';
import {
  resolveAccessibleKangurFeaturePageRoute,
} from '@/features/kangur/config/page-access';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurFeaturePageShell } from '@/features/kangur/ui/KangurFeaturePage';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
import { KangurPublicErrorBoundary } from '@/features/kangur/ui/KangurPublicErrorBoundary';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';

import type { JSX } from 'react';

export function KangurPublicApp({
  slug = [],
  basePath = '/',
  embedded = false,
  initialAppearance,
  initialMode,
  initialThemeSettings,
}: {
  slug?: string[];
  basePath?: string;
  embedded?: boolean;
  initialAppearance?: {
    mode?: KangurStorefrontAppearanceMode;
    themeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
  };
  initialMode?: KangurStorefrontAppearanceMode;
  initialThemeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
}): JSX.Element {
  const { data: session } = useOptionalNextAuthSession();
  const {
    normalizedBasePath,
    pageKey: accessiblePageKey,
    requestedPath: accessibleRequestedPath,
  } = resolveAccessibleKangurFeaturePageRoute({
    slug,
    basePath,
    session,
    fallbackPageKey: KANGUR_MAIN_PAGE_KEY,
  });
  const homeHref = getKangurHomeHref(normalizedBasePath);
  const isEmbedded = embedded;

  return (
    <KangurStorefrontAppearanceProvider
      initialAppearance={
        initialAppearance ?? {
          mode: initialMode,
          themeSettings: initialThemeSettings,
        }
      }
    >
      <KangurSurfaceClassSync>
        <KangurPublicErrorBoundary homeHref={homeHref}>
          <KangurRoutingProvider
            pageKey={accessiblePageKey}
            requestedPath={accessibleRequestedPath}
            requestedHref={accessibleRequestedPath}
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
