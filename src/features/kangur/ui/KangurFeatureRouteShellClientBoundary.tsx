'use client';

import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

import type { JSX } from 'react';

type KangurFeatureRouteShellClientBoundaryProps = {
  skipInitialClientBootLoader?: boolean;
};

export function KangurFeatureRouteShellClientBoundary({
  skipInitialClientBootLoader = false,
}: KangurFeatureRouteShellClientBoundaryProps = {}): JSX.Element {
  return (
    <KangurMainRoleProvider suppressMainRole>
      <KangurFeatureRouteShell skipInitialClientBootLoader={skipInitialClientBootLoader} />
    </KangurMainRoleProvider>
  );
}
