'use client';

import dynamic from 'next/dynamic';

import type { JSX } from 'react';

const KangurFeatureRouteShellClientBoundary = dynamic(
  () =>
    import('@/features/kangur/ui/KangurFeatureRouteShellClientBoundary').then(
      (module) => ({
        default: module.KangurFeatureRouteShellClientBoundary,
      })
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

export function KangurFeatureRouteShellClientLoader(): JSX.Element {
  return <KangurFeatureRouteShellClientBoundary />;
}
