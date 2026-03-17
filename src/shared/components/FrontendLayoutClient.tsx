'use client';

import React from 'react';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/storefront-appearance-settings';

const LazyCmsStorefrontAppearanceProvider = React.lazy(() =>
  import('@/features/cms/components/frontend/CmsStorefrontAppearance').then((mod) => ({
    default: mod.CmsStorefrontAppearanceProvider,
  }))
);
const LazyQueryErrorBoundary = React.lazy(() =>
  import('@/shared/ui/QueryErrorBoundary').then((mod) => ({
    default: mod.QueryErrorBoundary,
  }))
);
const LazyFrontendPublicOwnerShell = React.lazy(() =>
  import('./FrontendPublicOwnerShell').then((mod) => ({ default: mod.default }))
);

type FrontendLayoutClientProps = {
  publicOwner: 'cms' | 'kangur';
  storefrontAppearanceMode: 'dark' | 'default';
  kangurInitialMode?: KangurStorefrontAppearanceMode;
  children: React.ReactNode;
};

export function FrontendLayoutClient({
  publicOwner,
  storefrontAppearanceMode,
  kangurInitialMode,
  children,
}: FrontendLayoutClientProps): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className='min-h-screen bg-background p-6 text-sm text-muted-foreground'>
          Loading storefront...
        </div>
      }
    >
      <LazyCmsStorefrontAppearanceProvider initialMode={storefrontAppearanceMode}>
        <LazyQueryErrorBoundary>
          <LazyFrontendPublicOwnerShell
            publicOwner={publicOwner}
            kangurInitialMode={kangurInitialMode}
          >
            {children}
          </LazyFrontendPublicOwnerShell>
        </LazyQueryErrorBoundary>
      </LazyCmsStorefrontAppearanceProvider>
    </React.Suspense>
  );
}
