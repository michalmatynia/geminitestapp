import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';
import { Analytics } from '@vercel/analytics/next';

import type { ReactNode } from 'react';


export default function Layout({
  children: _children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <>
      <KangurFeatureRouteShell />
      <Analytics />
    </>
  );
}
