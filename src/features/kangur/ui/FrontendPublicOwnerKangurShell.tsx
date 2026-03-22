'use client';

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';

import type { JSX } from 'react';

type FrontendPublicOwnerKangurShellProps = {
  embedded: boolean;
  initialMode?: KangurStorefrontAppearanceMode;
  initialThemeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
};

export function FrontendPublicOwnerKangurShell({
  embedded,
  initialMode,
  initialThemeSettings,
}: FrontendPublicOwnerKangurShellProps): JSX.Element {
  return (
    <KangurStorefrontAppearanceProvider
      initialMode={initialMode}
      initialThemeSettings={initialThemeSettings}
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
  );
}
