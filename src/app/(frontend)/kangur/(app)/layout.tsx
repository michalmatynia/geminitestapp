import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

import type { ReactNode } from 'react';


export default function Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <>
      {children}
      <KangurFeatureRouteShell />
    </>
  );
}
