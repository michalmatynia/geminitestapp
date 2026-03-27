import { KangurFeatureRouteShellClientBoundary } from '@/features/kangur/ui/KangurFeatureRouteShellClientBoundary';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';

import type { ReactNode } from 'react';

type KangurAliasAppLayoutProps = {
  children: ReactNode;
};

export function KangurAliasAppLayout({
  children,
}: KangurAliasAppLayoutProps): ReactNode {
  return (
    <>
      <KangurServerShell />
      {children}
      <KangurFeatureRouteShellClientBoundary />
    </>
  );
}
