'use client';

import { useMemo } from 'react';

import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { useKangurPageAccess } from '@/features/kangur/ui/hooks/useKangurPageAccess';

export const resolveAccessibleKangurPrimaryNavigation = (
  navigation: KangurPrimaryNavigationProps,
  canAccessCurrentPage: boolean
): KangurPrimaryNavigationProps => {
  const accessibleCurrentPage = canAccessCurrentPage
    ? navigation.currentPage
    : ('Game' as KangurPrimaryNavigationProps['currentPage']);
  const forceLanguageSwitcherFallbackPath =
    navigation.forceLanguageSwitcherFallbackPath === true ||
    accessibleCurrentPage !== navigation.currentPage;

  if (
    accessibleCurrentPage === navigation.currentPage &&
    forceLanguageSwitcherFallbackPath === navigation.forceLanguageSwitcherFallbackPath
  ) {
    return navigation;
  }

  return {
    ...navigation,
    currentPage: accessibleCurrentPage,
    forceLanguageSwitcherFallbackPath,
  };
};

export const useAccessibleKangurPrimaryNavigation = (
  navigation: KangurPrimaryNavigationProps
): KangurPrimaryNavigationProps => {
  const { canAccess } = useKangurPageAccess(navigation.currentPage);

  return useMemo(
    () => resolveAccessibleKangurPrimaryNavigation(navigation, canAccess),
    [canAccess, navigation]
  );
};
