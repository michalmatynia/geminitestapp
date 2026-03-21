'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';
import { LoadingPanel } from '@/shared/ui/LoadingPanel';

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
  const translations = useTranslations('KangurPublic');

  return (
    <React.Suspense
      fallback={<LoadingPanel>{translations('entryLoading')}</LoadingPanel>}
    >
      <LazyKangurPublicApp
        basePath={basePath}
        initialMode={initialMode}
        initialThemeSettings={initialThemeSettings}
      />
    </React.Suspense>
  );
}
