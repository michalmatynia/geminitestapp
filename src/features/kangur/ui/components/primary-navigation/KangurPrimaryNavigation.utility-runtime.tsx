'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { LogOut } from 'lucide-react';

import {
  CmsStorefrontAppearanceButtons,
  type useOptionalCmsStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { KangurElevatedUserMenu } from '@/features/kangur/ui/components/KangurElevatedUserMenu';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';

import {
  type useKangurPrimaryNavigationState,
} from './KangurPrimaryNavigation.hooks';
import type {
  KangurNavActionConfig,
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
import {
  ICON_CLASSNAME,
  renderNavAction,
} from './KangurPrimaryNavigation.utils';

const KangurLanguageSwitcher = dynamic(() =>
  import('@/features/kangur/ui/components/KangurLanguageSwitcher').then((m) => ({
    default: m.KangurLanguageSwitcher,
  }))
);

export function buildActionWithClose(
  action: KangurNavActionConfig,
  onActionClick?: () => void
): KangurNavActionConfig {
  if (!onActionClick) {
    return action;
  }

  const existingClick = action.onClick;
  return {
    ...action,
    onClick: () => {
      existingClick?.();
      onActionClick();
    },
  };
}

export const resolveAppearanceControls = ({
  inline,
  kangurAppearanceLabels,
  kangurAppearanceModes,
  kangurAppearanceTone,
  storefrontAppearance,
}: {
  inline?: boolean;
  kangurAppearanceLabels: Record<'dark' | 'dawn' | 'default' | 'sunset', string>;
  kangurAppearanceModes: readonly ['default', 'dawn', 'sunset', 'dark'];
  kangurAppearanceTone: ReturnType<typeof useKangurPrimaryNavigationState>['kangurAppearance']['tone'];
  storefrontAppearance: ReturnType<typeof useOptionalCmsStorefrontAppearance>;
}): React.ReactNode =>
  storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      className={inline ? 'justify-start' : 'max-sm:w-full max-sm:justify-start'}
      label='Kangur appearance'
      modeLabels={kangurAppearanceLabels}
      modes={[...kangurAppearanceModes]}
      testId={
        inline
          ? 'kangur-primary-nav-appearance-controls-inline'
          : 'kangur-primary-nav-appearance-controls'
      }
      tone={kangurAppearanceTone}
    />
  ) : null;

export const resolveMobileMenuHeaderActions = ({
  appearanceControlsInline,
  basePath,
  currentPage,
  forceLanguageSwitcherFallbackPath,
  shouldRenderLanguageSwitcher,
}: {
  appearanceControlsInline: React.ReactNode;
  basePath: string;
  currentPage: KangurPrimaryNavigationProps['currentPage'];
  forceLanguageSwitcherFallbackPath: boolean;
  shouldRenderLanguageSwitcher: boolean;
}): React.ReactNode => {
  const shouldRenderMobileAppearanceHeader = Boolean(appearanceControlsInline);
  const shouldRenderMobileLanguageHeader = shouldRenderLanguageSwitcher;

  if (!shouldRenderMobileLanguageHeader && !shouldRenderMobileAppearanceHeader) {
    return null;
  }

  return (
    <>
      {shouldRenderMobileLanguageHeader ? (
        <KangurLanguageSwitcher
          basePath={basePath}
          currentPage={currentPage}
          forceFallbackPath={forceLanguageSwitcherFallbackPath}
        />
      ) : null}
      {shouldRenderMobileAppearanceHeader ? (
        <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
      ) : null}
    </>
  );
};

export const resolveKangurPrimaryNavigationUtilityVisibility = ({
  authActions,
  parentDashboardAction,
  resolvedAppearanceControls,
  resolvedShouldRenderLanguageSwitcher,
  rightAccessory,
  shouldRenderElevatedUserMenu,
  shouldRenderProfileMenu,
}: {
  authActions: React.ReactNode;
  parentDashboardAction: KangurNavActionConfig | null;
  resolvedAppearanceControls: React.ReactNode;
  resolvedShouldRenderLanguageSwitcher: boolean;
  rightAccessory: React.ReactNode;
  shouldRenderElevatedUserMenu: boolean;
  shouldRenderProfileMenu: boolean;
}): boolean =>
  Boolean(
    resolvedShouldRenderLanguageSwitcher ||
      resolvedAppearanceControls ||
      rightAccessory ||
      parentDashboardAction ||
      shouldRenderElevatedUserMenu ||
      shouldRenderProfileMenu ||
      authActions
  );

export const buildPrimaryNavigationLogoutAction = ({
  fallbackCopy,
  isLoggingOut,
  mobileNavItemClassName,
  onLogout,
}: {
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  isLoggingOut: boolean;
  mobileNavItemClassName: string;
  onLogout: () => void;
}): KangurNavActionConfig => ({
  className: mobileNavItemClassName,
  content: (
    <>
      <LogOut aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span className='truncate'>
        {isLoggingOut ? fallbackCopy.logoutPendingLabel : fallbackCopy.logoutLabel}
      </span>
    </>
  ),
  disabled: isLoggingOut,
  docId: 'profile_logout',
  onClick: onLogout,
  testId: 'kangur-primary-nav-logout',
});

export const resolveUtilityLanguageSwitcherNode = ({
  accessibleCurrentPage,
  basePath,
  forceLanguageSwitcherFallbackPath,
  mobileNavItemClassName,
  resolvedShouldRenderLanguageSwitcher,
}: {
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
  basePath: string;
  forceLanguageSwitcherFallbackPath: boolean;
  mobileNavItemClassName: string;
  resolvedShouldRenderLanguageSwitcher: boolean;
}): React.ReactNode => {
  if (!resolvedShouldRenderLanguageSwitcher) {
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
};

export const resolveUtilityParentDashboardNode = ({
  onActionClick,
  parentDashboardAction,
}: {
  onActionClick?: () => void;
  parentDashboardAction: KangurNavActionConfig | null;
}): React.ReactNode =>
  parentDashboardAction
    ? renderNavAction(buildActionWithClose(parentDashboardAction, onActionClick))
    : null;

export const resolveUtilityElevatedUserMenuNode = ({
  elevatedSessionUser,
  fallbackCopy,
  isCoarsePointer,
  onLogout,
  shouldRenderElevatedUserMenu,
}: {
  elevatedSessionUser: ReturnType<typeof useKangurPrimaryNavigationState>['elevatedSessionUser'];
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  isCoarsePointer: boolean;
  onLogout: () => void;
  shouldRenderElevatedUserMenu: boolean;
}): React.ReactNode => {
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
};

export const resolveUtilityProfileMenuNode = ({
  learnerProfileIsActive,
  mobileNavItemClassName,
  profileAvatar,
  profileHref,
  profileLabel,
  profileTransitionSourceId,
  shouldRenderProfileMenu,
}: {
  learnerProfileIsActive: boolean;
  mobileNavItemClassName: string;
  profileAvatar: ReturnType<typeof useKangurPrimaryNavigationState>['profileAvatar'];
  profileHref: string;
  profileLabel: string;
  profileTransitionSourceId: string;
  shouldRenderProfileMenu: boolean;
}): React.ReactNode => {
  if (!shouldRenderProfileMenu) {
    return null;
  }

  return (
    <KangurProfileMenu
      avatar={profileAvatar}
      label={profileLabel}
      profile={{ href: profileHref, isActive: learnerProfileIsActive }}
      transitionSourceId={profileTransitionSourceId}
      triggerClassName={mobileNavItemClassName}
    />
  );
};
