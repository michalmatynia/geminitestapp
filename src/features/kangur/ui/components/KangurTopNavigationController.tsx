'use client';

import { useLayoutEffect, useRef } from 'react';

import {
  KangurPrimaryNavigation,
  type KangurPrimaryNavigationProps,
} from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { useOptionalKangurTopNavigation } from '@/features/kangur/ui/context/KangurTopNavigationContext';

let kangurTopNavigationControllerId = 0;

const createKangurTopNavigationOwnerId = (): string => {
  kangurTopNavigationControllerId += 1;
  return `kangur-top-navigation:${kangurTopNavigationControllerId}`;
};

export function KangurTopNavigationController({
  navigation,
}: {
  navigation: KangurPrimaryNavigationProps;
}): React.JSX.Element | null {
  const topNavigation = useOptionalKangurTopNavigation();
  const ownerIdRef = useRef<string | null>(null);

  if (ownerIdRef.current === null) {
    ownerIdRef.current = createKangurTopNavigationOwnerId();
  }

  useLayoutEffect(() => {
    if (!topNavigation || !ownerIdRef.current) {
      return;
    }

    topNavigation.setNavigation(ownerIdRef.current, navigation);

    return () => {
      if (!ownerIdRef.current) {
        return;
      }

      topNavigation.clearNavigation(ownerIdRef.current);
    };
  }, [navigation, topNavigation]);

  if (!topNavigation) {
    return <KangurPrimaryNavigation {...navigation} />;
  }

  return null;
}
