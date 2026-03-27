import { KangurFeatureRouteShellClientBoundary } from '@/features/kangur/ui/KangurFeatureRouteShellClientBoundary';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';

import type { ReactNode } from 'react';


export default function Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <>
      <KangurServerShell />
      {children}
      <KangurFeatureRouteShellClientBoundary />
    </>
  );
}
