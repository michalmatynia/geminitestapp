'use client';

import { Analytics } from '@vercel/analytics/next';

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import { shouldRenderVercelAnalytics } from '@/shared/lib/analytics/vercel-analytics';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/appearance/storefront-appearance-settings';

import type { JSX } from 'react';

type FrontendPublicOwnerKangurShellProps = {
  embeddedOverride?: boolean;
  initialAppearance?: {
    mode?: KangurStorefrontAppearanceMode;
    themeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
  };
};

export type FrontendPublicOwnerKangurShellInitialAppearance =
  FrontendPublicOwnerKangurShellProps['initialAppearance'];

const resolveFrontendPublicOwnerEmbedded = (
  embeddedOverride: boolean | undefined
): boolean => embeddedOverride ?? false;

export function FrontendPublicOwnerKangurShell({
  embeddedOverride,
  initialAppearance,
}: FrontendPublicOwnerKangurShellProps): JSX.Element {
  const shouldRenderAnalytics = shouldRenderVercelAnalytics();
  const embedded = resolveFrontendPublicOwnerEmbedded(embeddedOverride);

  return (
    <>
      <KangurStorefrontAppearanceProvider
        initialAppearance={initialAppearance}
      >
        <KangurSurfaceClassSync>
          <KangurMainRoleProvider suppressMainRole>
            <KangurFeatureRouteShell
              basePath='/'
              embedded={embedded}
              forceBodyScrollLock={false}
            />
          </KangurMainRoleProvider>
        </KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
      {shouldRenderAnalytics ? <Analytics /> : null}
    </>
  );
}
