'use client';

import { useEffect, useState } from 'react';

import { KangurMainRoleProvider } from '@/features/kangur/ui/design/primitives/KangurPageContainer';

import type { JSX } from 'react';

type KangurFeatureRouteShellComponent = (
  typeof import('@/features/kangur/ui/KangurFeatureRouteShell')
)['KangurFeatureRouteShell'];

let cachedKangurFeatureRouteShell: KangurFeatureRouteShellComponent | null = null;
let kangurFeatureRouteShellPromise: Promise<KangurFeatureRouteShellComponent> | null = null;

const loadKangurFeatureRouteShell = async (): Promise<KangurFeatureRouteShellComponent> => {
  if (cachedKangurFeatureRouteShell) {
    return cachedKangurFeatureRouteShell;
  }

  if (!kangurFeatureRouteShellPromise) {
    kangurFeatureRouteShellPromise = import('@/features/kangur/ui/KangurFeatureRouteShell').then(
      (module) => {
        cachedKangurFeatureRouteShell = module.KangurFeatureRouteShell;
        return module.KangurFeatureRouteShell;
      }
    );
  }

  return kangurFeatureRouteShellPromise;
};

export function KangurFeatureRouteShellClientBoundary(): JSX.Element | null {
  const [routeShellComponent, setRouteShellComponent] =
    useState<KangurFeatureRouteShellComponent | null>(cachedKangurFeatureRouteShell);

  useEffect(() => {
    if (routeShellComponent) {
      return;
    }

    let cancelled = false;

    void loadKangurFeatureRouteShell()
      .then((component) => {
        if (!cancelled) {
          setRouteShellComponent(() => component);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [routeShellComponent]);

  if (!routeShellComponent) {
    return null;
  }

  const RouteShellComponent = routeShellComponent;
  return (
    <KangurMainRoleProvider suppressMainRole>
      <RouteShellComponent />
    </KangurMainRoleProvider>
  );
}
