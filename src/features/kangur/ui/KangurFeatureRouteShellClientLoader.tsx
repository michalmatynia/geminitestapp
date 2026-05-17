'use client';

import dynamic from 'next/dynamic';

import type { JSX } from 'react';

export type KangurFeatureRouteShellClientLoaderProps = {
  skipInitialClientBootLoader?: boolean;
};

const KangurFeatureRouteShellClientBoundary =
  dynamic<KangurFeatureRouteShellClientLoaderProps>(
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

export function KangurFeatureRouteShellClientLoader({
  skipInitialClientBootLoader = false,
}: KangurFeatureRouteShellClientLoaderProps = {}): JSX.Element {
  return (
    <KangurFeatureRouteShellClientBoundary
      skipInitialClientBootLoader={skipInitialClientBootLoader}
    />
  );
}
