import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { getKangurStorefrontDefaultMode } from '@/features/kangur/server/storefront-appearance';

import type { ReactNode } from 'react';

export default async function Layout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const initialMode = await getKangurStorefrontDefaultMode();
  return (
    <KangurStorefrontAppearanceProvider initialMode={initialMode}>
      <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
    </KangurStorefrontAppearanceProvider>
  );
}
