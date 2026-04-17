import { Suspense } from 'react';
import { headers } from 'next/headers';

import { getKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { safeHtml } from '@/shared/lib/security/safe-html';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';
import { KangurFeatureRouteShellClientBoundary } from '@/features/kangur/ui/KangurFeatureRouteShellClientBoundary';

import type { ReactNode } from 'react';

async function KangurAuthBootstrapScript(): Promise<ReactNode> {
  const bootstrapScript = await getKangurAuthBootstrapScript(await headers());
  if (!bootstrapScript) return null;
  return <script dangerouslySetInnerHTML={{ __html: safeHtml(bootstrapScript) }} />;
}

export default function KangurAppLayout({ children }: { children: ReactNode }): ReactNode {
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
