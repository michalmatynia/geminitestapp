import type { Session } from 'next-auth';

import { resolveAccessibleKangurPageKey } from '@/features/kangur/config/page-access';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation';

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
