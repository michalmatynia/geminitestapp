'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import type {
  KangurStorefrontAppearanceMode,
  KangurStorefrontThemeSettingsSnapshot,
} from '@/features/kangur/storefront-appearance-settings';

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
      fallback={
        <div className='min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground'>
          {translations('entryLoading')}
        </div>
      }
    >
      <LazyKangurPublicApp
        basePath={basePath}
        initialMode={initialMode}
        initialThemeSettings={initialThemeSettings}
      />
    </React.Suspense>
  );
}
