'use client';

import dynamic from 'next/dynamic';

import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';

import type { JSX } from 'react';

const KangurFeatureRouteShell = dynamic(
  () =>
    import('@/features/kangur/ui/KangurFeatureRouteShell').then((module) => ({
      default: module.KangurFeatureRouteShell,
    })),
  {
    ssr: false,
    loading: () => null,
  }
);

export function KangurFeatureRouteShellClientBoundary(): JSX.Element {
  return (
    <KangurMainRoleProvider suppressMainRole>
      <KangurFeatureRouteShell />
    </KangurMainRoleProvider>
  );
}
