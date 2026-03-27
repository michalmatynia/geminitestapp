import { KangurFeatureRouteShellClientBoundary } from '@/features/kangur/ui/KangurFeatureRouteShellClientBoundary';

import type { ReactNode } from 'react';


export default function Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <>
      {children}
      <KangurFeatureRouteShellClientBoundary />
    </>
  );
}
