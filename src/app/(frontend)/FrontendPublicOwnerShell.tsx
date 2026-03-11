'use client';

import { usePathname } from 'next/navigation';

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

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
    return <KangurFeatureRouteShell basePath='/' embedded={normalizedPathname === '/'} />;
  }

  return <>{children}</>;
}
