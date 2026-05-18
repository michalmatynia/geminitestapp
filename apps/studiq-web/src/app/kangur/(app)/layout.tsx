import { getCachedKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { renderKangurAuthBootstrapScript } from '@/features/kangur/server/renderKangurAuthBootstrapScript';
import { KangurFeatureRouteShellClientLoader } from '@/features/kangur/ui/KangurFeatureRouteShellClientLoader';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';

import type { ReactNode } from 'react';

export default async function KangurAppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const bootstrapScript = await getCachedKangurAuthBootstrapScript();

  return (
    <>
      {renderKangurAuthBootstrapScript(bootstrapScript)}
      <KangurServerShell />
      {children}
      <KangurFeatureRouteShellClientLoader skipInitialClientBootLoader />
    </>
  );
}
