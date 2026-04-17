import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';
import { KangurFeatureRouteShellClientBoundary } from '@/features/kangur/ui/KangurFeatureRouteShellClientBoundary';

import type { ReactNode } from 'react';

const KANGUR_AUTH_BOOTSTRAP_SCRIPT = 'window.__KANGUR_AUTH_BOOTSTRAP__=null;';

export default function KangurAppLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: KANGUR_AUTH_BOOTSTRAP_SCRIPT }} />
      <KangurServerShell />
      {children}
      <KangurFeatureRouteShellClientBoundary />
    </>
  );
}
