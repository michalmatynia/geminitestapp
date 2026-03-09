import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

import type { ReactNode } from 'react';


export default function Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>;
}
