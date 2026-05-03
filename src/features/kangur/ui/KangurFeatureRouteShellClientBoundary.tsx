'use client';

import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';
import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

import type { JSX } from 'react';

export function KangurFeatureRouteShellClientBoundary(): JSX.Element {
  return (
    <KangurMainRoleProvider suppressMainRole>
      <KangurFeatureRouteShell />
    </KangurMainRoleProvider>
  );
}
