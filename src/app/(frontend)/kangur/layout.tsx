import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { ReactNode } from 'react';

const KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY = 'kangur-storefront-appearance-mode';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <CmsStorefrontAppearanceProvider
      initialMode='default'
      storageKey={KANGUR_STOREFRONT_APPEARANCE_STORAGE_KEY}
    >
      <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
    </CmsStorefrontAppearanceProvider>
  );
}
