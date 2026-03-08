import type { ReactNode } from 'react';

import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';

export default function Layout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <KangurSurfaceClassSync>{children}</KangurSurfaceClassSync>;
}
