'use client';

import React from 'react';

import { getKangurPageHref } from '@/features/kangur/config/routing';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { KangurLanguageSwitcher } from '@/features/kangur/ui/components/KangurLanguageSwitcher';
import { KangurElevatedUserMenu } from '@/features/kangur/ui/components/KangurElevatedUserMenu';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { KangurPrimaryNavigationAppearanceControls } from './KangurPrimaryNavigation.appearance-controls';

import type { useKangurPrimaryNavigationState } from './KangurPrimaryNavigation.hooks';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';

type PrimaryNavigationState = ReturnType<typeof useKangurPrimaryNavigationState>;

type KangurPrimaryNavigationDeferredUtilityRuntimeProps = {
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
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
  shouldRenderAppearanceControls: boolean;
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
  authUser,
}: {
  authUser: PrimaryNavigationState['authUser'];
}): string | null {
  const activeLearner = authUser?.activeLearner ?? null;
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
  authUser,
  fallbackCopy,
}: {
  authUser: PrimaryNavigationState['authUser'];
  fallbackCopy: PrimaryNavigationState['fallbackCopy'];
}): string {
  const profileDisplayName = resolveDeferredUtilityProfileDisplayName({
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
  authUser,
  basePath,
  fallbackCopy,
  learnerProfileIsActive,
  mobileNavItemClassName,
  profileTransitionSourceId,
  shouldRenderProfileMenu,
}: Pick<
  KangurPrimaryNavigationDeferredUtilityRuntimeProps,
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

  const activeLearner = authUser?.activeLearner ?? null;
  const profileAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const profileHref = getKangurPageHref('LearnerProfile', basePath);
  const profileLabel = resolveDeferredUtilityProfileLabel({
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
  accessibleCurrentPage,
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
  shouldRenderAppearanceControls,
  shouldRenderLanguageSwitcher,
  shouldRenderProfileMenu,
}: KangurPrimaryNavigationDeferredUtilityRuntimeProps): React.ReactNode {
  const kangurAppearance = useKangurStorefrontAppearance();

  return (
    <>
      <DeferredUtilityLanguageSwitcher
        accessibleCurrentPage={accessibleCurrentPage}
        basePath={basePath}
        forceLanguageSwitcherFallbackPath={forceLanguageSwitcherFallbackPath}
        mobileNavItemClassName={mobileNavItemClassName}
        shouldRenderLanguageSwitcher={shouldRenderLanguageSwitcher}
      />
      {shouldRenderAppearanceControls ? (
        <KangurPrimaryNavigationAppearanceControls tone={kangurAppearance.tone} />
      ) : null}
      <DeferredUtilityElevatedUserMenu
        authUser={authUser}
        elevatedSessionSnapshot={elevatedSessionSnapshot}
        fallbackCopy={fallbackCopy}
        isCoarsePointer={isCoarsePointer}
        onLogout={onLogout}
        shouldRenderElevatedUserMenu={shouldRenderElevatedUserMenu}
      />
      <DeferredUtilityProfileMenu
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
