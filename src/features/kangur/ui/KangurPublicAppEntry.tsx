'use client';

import React from 'react';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/storefront-appearance-settings';

const LazyKangurPublicApp = React.lazy(() =>
  import('./KangurPublicApp').then((mod) => ({
    default: mod.KangurPublicApp,
  }))
);

export function KangurPublicAppEntry({
  basePath,
  initialMode,
}: {
  basePath: string;
  initialMode?: KangurStorefrontAppearanceMode;
}): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className='min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground'>
          Loading Kangur...
        </div>
      }
    >
      <LazyKangurPublicApp basePath={basePath} initialMode={initialMode} />
    </React.Suspense>
  );
}
