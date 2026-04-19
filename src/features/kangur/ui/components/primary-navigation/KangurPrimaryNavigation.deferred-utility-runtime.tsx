'use client';

import React from 'react';

import { getKangurPageHref } from '@/features/kangur/config/routing';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { KangurLanguageSwitcher } from '@/features/kangur/ui/components/KangurLanguageSwitcher';
import { KangurElevatedUserMenu } from '@/features/kangur/ui/components/KangurElevatedUserMenu';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';

import type { useKangurPrimaryNavigationState } from './KangurPrimaryNavigation.hooks';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';

type PrimaryNavigationState = ReturnType<typeof useKangurPrimaryNavigationState>;

type KangurPrimaryNavigationDeferredUtilityRuntimeProps = {
  activeLearner: PrimaryNavigationState['activeLearner'];
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
  appearanceControls: React.ReactNode;
  authUser: PrimaryNavigationState['authUser'];
  basePath: string;
  elevatedSessionSnapshot: PrimaryNavigationState['elevatedSessionSnapshot'];
  fallbackCopy: PrimaryNavigationState['fallbackCopy'];
  forceLanguageSwitcherFallbackPath: boolean;
  isCoarsePointer: boolean;
  learnerProfileIsActive: boolean;
  mobileNavItemClassName: string;
  onLogout: () => void;
  profileTransitionSourceId: string;
  shouldRenderElevatedUserMenu: boolean;
  shouldRenderLanguageSwitcher: boolean;
  shouldRenderProfileMenu: boolean;
};

function resolveDeferredUtilityElevatedSessionUser({
  authUser,
  elevatedSessionSnapshot,
}: {
  authUser: PrimaryNavigationState['authUser'];
  elevatedSessionSnapshot: PrimaryNavigationState['elevatedSessionSnapshot'];
}) {
  if (!elevatedSessionSnapshot) {
    return null;
  }

  return {
    ...elevatedSessionSnapshot,
    email: elevatedSessionSnapshot.email ?? authUser?.email?.trim() ?? null,
    name: elevatedSessionSnapshot.name ?? authUser?.full_name.trim() ?? null,
  };
}

function resolveDeferredUtilityProfileDisplayName({
  activeLearner,
  authUser,
}: {
  activeLearner: PrimaryNavigationState['activeLearner'];
  authUser: PrimaryNavigationState['authUser'];
}): string | null {
  const candidates = [
    activeLearner?.displayName,
    activeLearner?.loginName,
    authUser?.full_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return null;
}

function resolveDeferredUtilityProfileLabel({
  activeLearner,
  authUser,
  fallbackCopy,
}: {
  activeLearner: PrimaryNavigationState['activeLearner'];
  authUser: PrimaryNavigationState['authUser'];
  fallbackCopy: PrimaryNavigationState['fallbackCopy'];
}): string {
  const profileDisplayName = resolveDeferredUtilityProfileDisplayName({
    activeLearner,
    authUser,
  });

  return profileDisplayName
    ? fallbackCopy.profileLabelWithName(profileDisplayName)
    : fallbackCopy.profileLabel;
}

function DeferredUtilityLanguageSwitcher({
  accessibleCurrentPage,
  basePath,
  forceLanguageSwitcherFallbackPath,
  mobileNavItemClassName,
  shouldRenderLanguageSwitcher,
}: Pick<
  KangurPrimaryNavigationDeferredUtilityRuntimeProps,
  | 'accessibleCurrentPage'
  | 'basePath'
  | 'forceLanguageSwitcherFallbackPath'
  | 'mobileNavItemClassName'
  | 'shouldRenderLanguageSwitcher'
>): React.ReactNode {
  if (!shouldRenderLanguageSwitcher) {
    return null;
  }

  return (
    <KangurLanguageSwitcher
      basePath={basePath}
      className={mobileNavItemClassName}
      currentPage={accessibleCurrentPage}
      forceFallbackPath={forceLanguageSwitcherFallbackPath}
    />
  );
}

function DeferredUtilityElevatedUserMenu({
  authUser,
  elevatedSessionSnapshot,
  fallbackCopy,
  isCoarsePointer,
  onLogout,
  shouldRenderElevatedUserMenu,
}: Pick<
  KangurPrimaryNavigationDeferredUtilityRuntimeProps,
  | 'authUser'
  | 'elevatedSessionSnapshot'
  | 'fallbackCopy'
  | 'isCoarsePointer'
  | 'onLogout'
  | 'shouldRenderElevatedUserMenu'
>): React.ReactNode {
  const elevatedSessionUser = resolveDeferredUtilityElevatedSessionUser({
    authUser,
    elevatedSessionSnapshot,
  });

  if (!shouldRenderElevatedUserMenu || !elevatedSessionUser) {
    return null;
  }

  return (
    <KangurElevatedUserMenu
      adminLabel={fallbackCopy.adminLabel}
      logoutLabel={fallbackCopy.logoutLabel}
      onLogout={onLogout}
      triggerAriaLabel={fallbackCopy.avatarLabel}
      triggerClassName={
        isCoarsePointer
          ? 'min-h-12 min-w-12 touch-manipulation select-none active:scale-[0.985]'
          : undefined
      }
      user={elevatedSessionUser}
    />
  );
}

function DeferredUtilityProfileMenu({
  activeLearner,
  authUser,
  basePath,
  fallbackCopy,
  learnerProfileIsActive,
  mobileNavItemClassName,
  profileTransitionSourceId,
  shouldRenderProfileMenu,
}: Pick<
  KangurPrimaryNavigationDeferredUtilityRuntimeProps,
  | 'activeLearner'
  | 'authUser'
  | 'basePath'
  | 'fallbackCopy'
  | 'learnerProfileIsActive'
  | 'mobileNavItemClassName'
  | 'profileTransitionSourceId'
  | 'shouldRenderProfileMenu'
>): React.ReactNode {
  if (!shouldRenderProfileMenu) {
    return null;
  }

  const profileAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const profileHref = getKangurPageHref('LearnerProfile', basePath);
  const profileLabel = resolveDeferredUtilityProfileLabel({
    activeLearner,
    authUser,
    fallbackCopy,
  });

  return (
    <KangurProfileMenu
      avatar={profileAvatar}
      label={profileLabel}
      profile={{ href: profileHref, isActive: learnerProfileIsActive }}
      transitionSourceId={profileTransitionSourceId}
      triggerClassName={mobileNavItemClassName}
    />
  );
}

export function KangurPrimaryNavigationDeferredUtilityRuntime({
  activeLearner,
  accessibleCurrentPage,
  appearanceControls,
  authUser,
  basePath,
  elevatedSessionSnapshot,
  fallbackCopy,
  forceLanguageSwitcherFallbackPath,
  isCoarsePointer,
  learnerProfileIsActive,
  mobileNavItemClassName,
  onLogout,
  profileTransitionSourceId,
  shouldRenderElevatedUserMenu,
  shouldRenderLanguageSwitcher,
  shouldRenderProfileMenu,
}: KangurPrimaryNavigationDeferredUtilityRuntimeProps): React.ReactNode {
  return (
    <>
      <DeferredUtilityLanguageSwitcher
        accessibleCurrentPage={accessibleCurrentPage}
        basePath={basePath}
        forceLanguageSwitcherFallbackPath={forceLanguageSwitcherFallbackPath}
        mobileNavItemClassName={mobileNavItemClassName}
        shouldRenderLanguageSwitcher={shouldRenderLanguageSwitcher}
      />
      {appearanceControls}
      <DeferredUtilityElevatedUserMenu
        authUser={authUser}
        elevatedSessionSnapshot={elevatedSessionSnapshot}
        fallbackCopy={fallbackCopy}
        isCoarsePointer={isCoarsePointer}
        onLogout={onLogout}
        shouldRenderElevatedUserMenu={shouldRenderElevatedUserMenu}
      />
      <DeferredUtilityProfileMenu
        activeLearner={activeLearner}
        authUser={authUser}
        basePath={basePath}
        fallbackCopy={fallbackCopy}
        learnerProfileIsActive={learnerProfileIsActive}
        mobileNavItemClassName={mobileNavItemClassName}
        profileTransitionSourceId={profileTransitionSourceId}
        shouldRenderProfileMenu={shouldRenderProfileMenu}
      />
    </>
  );
}
