'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { useKangurDeferredStandaloneHomeReady } from '@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady';
import { GAME_HOME_UTILITY_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';

import { useKangurPrimaryNavigationHasAppearanceControls } from './KangurPrimaryNavigation.appearance-controls';
import type { useKangurPrimaryNavigationContext } from './KangurPrimaryNavigation.context';

const KangurPrimaryNavigationDeferredUtilityRuntime = dynamic(() =>
  import('./KangurPrimaryNavigation.deferred-utility-runtime').then((m) => ({
    default: m.KangurPrimaryNavigationDeferredUtilityRuntime,
  }))
);

type DeferredUtilityMountProps = {
  authUser: ReturnType<typeof useKangurPrimaryNavigationContext>['authUser'];
  basePath: string;
  currentPage: ReturnType<typeof useKangurPrimaryNavigationContext>['props']['currentPage'];
  elevatedSessionSnapshot: ReturnType<
    typeof useKangurPrimaryNavigationContext
  >['elevatedSessionSnapshot'];
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationContext>['fallbackCopy'];
  forceLanguageSwitcherFallbackPath: boolean;
  isCoarsePointer: boolean;
  mobileNavItemClassName: string;
  onLogout: () => void;
  profileTransitionSourceId: string;
  shouldRequestAppearanceControls: boolean;
  shouldRenderElevatedUserMenu: boolean;
  shouldRenderLanguageSwitcher: boolean;
  shouldRenderProfileMenu: boolean;
};

export function KangurPrimaryNavigationDeferredUtilityMount({
  authUser,
  basePath,
  currentPage,
  elevatedSessionSnapshot,
  fallbackCopy,
  forceLanguageSwitcherFallbackPath,
  isCoarsePointer,
  mobileNavItemClassName,
  onLogout,
  profileTransitionSourceId,
  shouldRequestAppearanceControls,
  shouldRenderElevatedUserMenu,
  shouldRenderLanguageSwitcher,
  shouldRenderProfileMenu,
}: DeferredUtilityMountProps): React.ReactNode {
  const hasAppearanceControls = useKangurPrimaryNavigationHasAppearanceControls();
  const isStandaloneHomeUtilityReady = useKangurDeferredStandaloneHomeReady({
    minimumDelayMs: GAME_HOME_UTILITY_IDLE_DELAY_MS,
  });
  const learnerProfileIsActive = currentPage === 'LearnerProfile';
  const shouldRenderAppearanceControls =
    shouldRequestAppearanceControls && hasAppearanceControls;
  const resolvedShouldRenderAppearanceControls =
    shouldRenderAppearanceControls && isStandaloneHomeUtilityReady;
  const resolvedShouldRenderElevatedUserMenu =
    shouldRenderElevatedUserMenu && isStandaloneHomeUtilityReady;
  const resolvedShouldRenderLanguageSwitcher =
    shouldRenderLanguageSwitcher && isStandaloneHomeUtilityReady;
  const resolvedShouldRenderProfileMenu =
    shouldRenderProfileMenu && isStandaloneHomeUtilityReady;
  const shouldRenderDeferredUtilityRuntime =
    resolvedShouldRenderAppearanceControls ||
    resolvedShouldRenderElevatedUserMenu ||
    resolvedShouldRenderLanguageSwitcher ||
    resolvedShouldRenderProfileMenu;

  if (!shouldRenderDeferredUtilityRuntime) {
    return null;
  }

  return (
    <KangurPrimaryNavigationDeferredUtilityRuntime
      accessibleCurrentPage={currentPage}
      authUser={authUser}
      basePath={basePath}
      elevatedSessionSnapshot={elevatedSessionSnapshot}
      fallbackCopy={fallbackCopy}
      forceLanguageSwitcherFallbackPath={forceLanguageSwitcherFallbackPath}
      isCoarsePointer={isCoarsePointer}
      learnerProfileIsActive={learnerProfileIsActive}
      mobileNavItemClassName={mobileNavItemClassName}
      onLogout={onLogout}
      profileTransitionSourceId={profileTransitionSourceId}
      shouldRenderAppearanceControls={resolvedShouldRenderAppearanceControls}
      shouldRenderElevatedUserMenu={resolvedShouldRenderElevatedUserMenu}
      shouldRenderLanguageSwitcher={resolvedShouldRenderLanguageSwitcher}
      shouldRenderProfileMenu={resolvedShouldRenderProfileMenu}
    />
  );
}
