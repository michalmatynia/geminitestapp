/*
 * Kangur alias app layout (server)
 *
 * Purpose: Server-side layout used when Kangur is embedded as an alias route
 * inside the storefront. Responsibilities:
 * - Inject auth bootstrap scripts safely into the head
 * - Render the server Kangur shell to ensure SSR content contains landmarks and
 *   accessible markup
 * - Mount the client boundary for interactive route shells
 *
 * Accessibility notes:
 * - Scripts injected here should not trap focus; ensure the rendered server
 *   shell includes a focusable main target and skip link bindings.
 */
import { Suspense } from 'react';
import { headers } from 'next/headers';

import { getKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { renderKangurAuthBootstrapScript } from '@/features/kangur/server/renderKangurAuthBootstrapScript';
import { KangurFeatureRouteShellClientLoader } from '@/features/kangur/ui/KangurFeatureRouteShellClientLoader';
import { KangurServerShell } from '@/features/kangur/ui/components/KangurServerShell';

import type { ReactNode } from 'react';

type KangurAliasAppLayoutProps = {
  children: ReactNode;
};

async function KangurAuthBootstrapScript(): Promise<ReactNode> {
  const bootstrapScript = await getKangurAuthBootstrapScript(await headers());
  return renderKangurAuthBootstrapScript(bootstrapScript);
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
      <KangurFeatureRouteShellClientLoader />
    </>
  );
}
