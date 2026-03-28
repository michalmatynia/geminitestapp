'use client';

import { Analytics } from '@vercel/analytics/next';
import { usePathname } from 'next/navigation';

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import { shouldRenderVercelAnalytics } from '@/shared/lib/analytics/vercel-analytics';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';

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

export function FrontendPublicOwnerKangurShell({
  embeddedOverride,
  initialAppearance,
}: FrontendPublicOwnerKangurShellProps): JSX.Element {
  const shouldRenderAnalytics = shouldRenderVercelAnalytics();
  const pathname = usePathname();
  const browserPathname =
    typeof window === 'undefined' ? null : window.location.pathname?.trim() || null;
  const resolvedPathname = pathname?.trim() || browserPathname || '/';
  const normalizedPathname = stripSiteLocalePrefix(resolvedPathname);
  const embedded = embeddedOverride ?? normalizedPathname === '/';

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
