import { Suspense } from 'react';
import { headers } from 'next/headers';

import { getKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { KangurFeatureRouteShellClientBoundary } from '@/features/kangur/ui/KangurFeatureRouteShellClientBoundary';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';
import { safeHtml } from '@/shared/lib/security/safe-html';

import type { ReactNode } from 'react';

type KangurAliasAppLayoutProps = {
  children: ReactNode;
};

async function KangurAuthBootstrapScript(): Promise<ReactNode> {
  const bootstrapScript = await getKangurAuthBootstrapScript(await headers());
  if (!bootstrapScript) return null;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: safeHtml(bootstrapScript),
      }}
    />
  );
}

export function KangurAliasAppLayout({
  children,
}: KangurAliasAppLayoutProps): ReactNode {
  return (
    <>
      <Suspense fallback={null}>
        <KangurAuthBootstrapScript />
      </Suspense>
      <KangurServerShell />
      {children}
      <KangurFeatureRouteShellClientBoundary />
    </>
  );
}
