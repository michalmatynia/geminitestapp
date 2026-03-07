import type { ReactNode } from 'react';

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

export default function Layout({
  children: _children,
}: {
  children: ReactNode;
}): ReactNode {
  return <KangurFeatureRouteShell />;
}
