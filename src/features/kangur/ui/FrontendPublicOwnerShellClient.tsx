'use client';

import { usePathname } from 'next/navigation';

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives';
import type { KangurStorefrontAppearanceMode } from '@/features/kangur/storefront-appearance-settings';

import type { JSX, ReactNode } from 'react';

export type FrontendPublicOwnerShellProps = {
  publicOwner: 'cms' | 'kangur';
  children: ReactNode;
  kangurInitialMode?: KangurStorefrontAppearanceMode;
};

export default function FrontendPublicOwnerShellClient({
  publicOwner,
  children,
  kangurInitialMode,
}: FrontendPublicOwnerShellProps): JSX.Element {
  const pathname = usePathname();
  const normalizedPathname = pathname?.trim() || '/';
  const isKangurAliasRoute =
    normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');

  if (publicOwner === 'kangur' && !isKangurAliasRoute) {
    return (
      <KangurStorefrontAppearanceProvider initialMode={kangurInitialMode}>
        <KangurSurfaceClassSync>
          <KangurMainRoleProvider suppressMainRole>
            <KangurFeatureRouteShell basePath='/' embedded={normalizedPathname === '/'} />
          </KangurMainRoleProvider>
        </KangurSurfaceClassSync>
      </KangurStorefrontAppearanceProvider>
    );
  }

  return <>{children}</>;
}
