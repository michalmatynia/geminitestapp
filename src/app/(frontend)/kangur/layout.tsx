import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { ReactNode } from 'react';

import './kangur.css';

export default function Layout({ children }: { children: ReactNode }): ReactNode {
  return (
    <KangurStorefrontAppearanceProvider>
      <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>
    </KangurStorefrontAppearanceProvider>
  );
}
