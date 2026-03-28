import { headers } from 'next/headers';

import { getKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { KangurFeatureRouteShellClientBoundary } from '@/features/kangur/ui/KangurFeatureRouteShellClientBoundary';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';
import { safeHtml } from '@/shared/lib/security/safe-html';

import type { ReactNode } from 'react';

type KangurAliasAppLayoutProps = {
  children: ReactNode;
};

export async function KangurAliasAppLayout({
  children,
}: KangurAliasAppLayoutProps): Promise<ReactNode> {
  const bootstrapScript = await getKangurAuthBootstrapScript(await headers());

  return (
    <>
      {bootstrapScript ? (
        <script
          dangerouslySetInnerHTML={{
            __html: safeHtml(bootstrapScript),
          }}
        />
      ) : null}
      <KangurServerShell />
      {children}
      <KangurFeatureRouteShellClientBoundary />
    </>
  );
}
