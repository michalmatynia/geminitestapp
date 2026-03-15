'use client';

import { usePathname } from 'next/navigation';

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives';

import type { ReactNode } from 'react';

type FrontendPublicOwnerShellProps = {
  publicOwner: 'cms' | 'kangur';
  children: ReactNode;
};

export default function FrontendPublicOwnerShell({
  publicOwner,
  children,
}: FrontendPublicOwnerShellProps): React.JSX.Element {
  const pathname = usePathname();
  const normalizedPathname = pathname?.trim() || '/';
  const isKangurAliasRoute =
    normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');

  if (publicOwner === 'kangur' && !isKangurAliasRoute) {
    return (
      <KangurStorefrontAppearanceProvider>
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
