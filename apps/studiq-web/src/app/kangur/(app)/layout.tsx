import { headers } from 'next/headers';

import { getKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { renderKangurAuthBootstrapScript } from '@/features/kangur/server/renderKangurAuthBootstrapScript';
import { KangurFeatureRouteShellClientLoader } from '@/features/kangur/ui/KangurFeatureRouteShellClientLoader';

import type { ReactNode } from 'react';

export default async function KangurAppLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const bootstrapScript = await getKangurAuthBootstrapScript(await headers());

  return (
    <>
      {renderKangurAuthBootstrapScript(bootstrapScript)}
      {children}
      <KangurFeatureRouteShellClientLoader />
    </>
  );
}
