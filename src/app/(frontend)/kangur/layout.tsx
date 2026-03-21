import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { getKangurStorefrontInitialState } from '@/features/kangur/server/storefront-appearance';

import type { ReactNode } from 'react';

import './kangur.css';

export default async function Layout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const initialState = await getKangurStorefrontInitialState();
  return (
    <KangurStorefrontAppearanceProvider
      initialMode={initialState.initialMode}
      initialThemeSettings={initialState.initialThemeSettings}
    >
      <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
    </KangurStorefrontAppearanceProvider>
  );
}
