'use client';

import React from 'react';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';
import { KangurAppLoader } from '@/features/kangur/ui/components/KangurAppLoader';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/KangurTopNavigationSkeleton';

const LazyKangurPublicApp = React.lazy(() =>
  import('./KangurPublicApp').then((mod) => ({
    default: mod.KangurPublicApp,
  }))
);

export function KangurPublicAppEntry({
  basePath,
  initialMode,
  initialThemeSettings,
}: {
  basePath: string;
  initialMode?: KangurStorefrontAppearanceMode;
  initialThemeSettings?: Partial<KangurStorefrontThemeSettingsSnapshot>;
}): React.JSX.Element {

  return (
    <React.Suspense
      fallback={(
        <>
          <KangurTopNavigationSkeleton />
          <KangurAppLoader offsetTopBar visible={true} />
        </>
      )}
    >
      <LazyKangurPublicApp
        basePath={basePath}
        initialMode={initialMode}
        initialThemeSettings={initialThemeSettings}
      />
    </React.Suspense>
  );
}
