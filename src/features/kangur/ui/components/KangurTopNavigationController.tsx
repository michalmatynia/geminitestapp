'use client';

import { useEffect, useRef } from 'react';

import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { useAccessibleKangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation.access';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation.types';
import { useOptionalKangurTopNavigation } from '@/features/kangur/ui/context/KangurTopNavigationContext';

let kangurTopNavigationControllerId = 0;

const createKangurTopNavigationOwnerId = (): string => {
  kangurTopNavigationControllerId += 1;
  return `kangur-top-navigation:${kangurTopNavigationControllerId}`;
};

function KangurLocalTopNavigation({
  navigation,
}: {
  navigation: KangurPrimaryNavigationProps;
}): React.JSX.Element {
  const accessibleNavigation = useAccessibleKangurPrimaryNavigation(navigation);
  return <KangurPrimaryNavigation {...accessibleNavigation} />;
}

export function KangurTopNavigationController({
  navigation,
  visible = true,
}: {
  navigation: KangurPrimaryNavigationProps;
  visible?: boolean;
}): React.JSX.Element | null {
  const topNavigation = useOptionalKangurTopNavigation();
  const ownerIdRef = useRef<string | null>(null);
  const primaryNavigation = navigation;

  if (ownerIdRef.current === null) {
    ownerIdRef.current = createKangurTopNavigationOwnerId();
  }

  useEffect(() => {
    if (!topNavigation || !ownerIdRef.current) {
      return;
    }

    if (!visible) {
      topNavigation.clearNavigation(ownerIdRef.current, { immediate: true });
      return;
    }

    topNavigation.setNavigation(ownerIdRef.current, primaryNavigation);

    return () => {
      if (!ownerIdRef.current) {
        return;
      }

      topNavigation.clearNavigation(ownerIdRef.current);
    };
  }, [primaryNavigation, topNavigation, visible]);

  if (!topNavigation) {
    return visible ? <KangurLocalTopNavigation navigation={primaryNavigation} /> : null;
  }

  return null;
}
