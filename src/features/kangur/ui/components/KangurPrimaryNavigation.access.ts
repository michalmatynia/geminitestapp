'use client';

import { useMemo } from 'react';
import type { Session } from 'next-auth';

import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';

export const resolveAccessibleKangurPrimaryNavigation = (
  navigation: KangurPrimaryNavigationProps,
  session: Session | null | undefined
): KangurPrimaryNavigationProps => {
  const accessibleCurrentPage = resolveAccessibleKangurPageKey(
    navigation.currentPage,
    session,
    'Game'
  ) as KangurPrimaryNavigationProps['currentPage'];
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
  const { data: session } = useOptionalNextAuthSession();

  return useMemo(
    () => resolveAccessibleKangurPrimaryNavigation(navigation, session),
    [navigation, session]
  );
};
