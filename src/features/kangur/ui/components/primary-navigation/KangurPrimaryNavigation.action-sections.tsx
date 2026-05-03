'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { LogOut } from 'lucide-react';

import {
  KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS,
  useKangurPrimaryNavigationContext,
} from './KangurPrimaryNavigation.context';
import { ICON_CLASSNAME, renderNavAction } from './KangurPrimaryNavigation.utils';

const KangurPrimaryNavigationDeferredUtilityMount = dynamic(() =>
  import('./KangurPrimaryNavigation.deferred-utility-mount').then((m) => ({
    default: m.KangurPrimaryNavigationDeferredUtilityMount,
  }))
);
const KangurPrimaryNavigationInlineAppearanceMount = dynamic(() =>
  import('./KangurPrimaryNavigation.inline-appearance-mount').then((m) => ({
    default: m.KangurPrimaryNavigationInlineAppearanceMount,
  }))
);
const KangurPrimaryNavigationGuestAuthActions = dynamic(() =>
  import('./KangurPrimaryNavigation.guest-auth-actions').then((m) => ({
    default: m.KangurPrimaryNavigationGuestAuthActions,
  }))
);

function buildActionWithClose<T extends { onClick?: () => void }>(
  action: T,
  onActionClick?: () => void
): T {
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

function buildPrimaryNavigationLogoutAction({
  fallbackCopy,
  isLoggingOut,
  mobileNavItemClassName,
  onLogout,
}: {
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationContext>['fallbackCopy'];
  isLoggingOut: boolean;
  mobileNavItemClassName: string;
  onLogout: () => void;
}): {
  className: string;
  content: React.ReactNode;
  disabled: boolean;
  docId: string;
  onClick: () => void;
  testId: string;
} {
  return {
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
  };
}

function resolveUtilityParentDashboardNode({
  onActionClick,
  parentDashboardAction,
}: {
  onActionClick?: () => void;
  parentDashboardAction: ReturnType<
    typeof useKangurPrimaryNavigationContext
  >['derived']['parentDashboardAction'];
}): React.ReactNode {
  if (!parentDashboardAction) {
    return null;
  }

  return renderNavAction(buildActionWithClose(parentDashboardAction, onActionClick));
}

function resolvePrimaryNavigationDeferredMenuState({
  authUser,
  effectiveIsAuthenticated,
  elevatedSessionSnapshot,
}: {
  authUser: ReturnType<typeof useKangurPrimaryNavigationContext>['authUser'];
  effectiveIsAuthenticated: boolean;
  elevatedSessionSnapshot: ReturnType<
    typeof useKangurPrimaryNavigationContext
  >['elevatedSessionSnapshot'];
}): {
  shouldRenderElevatedUserMenu: boolean;
  shouldRenderProfileMenu: boolean;
} {
  const activeLearner = authUser?.activeLearner ?? null;
  const hasActiveLearner = (activeLearner?.id?.trim() ?? '').length > 0;
  const hasElevatedSessionSnapshot = elevatedSessionSnapshot != null;
  const isParentAccount = authUser?.actorType === 'parent';

  return {
    shouldRenderElevatedUserMenu:
      effectiveIsAuthenticated && hasElevatedSessionSnapshot && !hasActiveLearner,
    shouldRenderProfileMenu:
      effectiveIsAuthenticated &&
      (!isParentAccount || hasActiveLearner) &&
      (!hasElevatedSessionSnapshot || hasActiveLearner),
  };
}

export function KangurPrimaryNavigationAuthActions({
  onActionClick,
}: {
  onActionClick?: () => void;
}): React.ReactNode {
  const {
    effectiveIsAuthenticated,
    isLoggingOut,
    props,
    derived,
    fallbackCopy,
  } = useKangurPrimaryNavigationContext();

  const { mobileNavItemClassName } = derived;

  if (effectiveIsAuthenticated) {
    return renderNavAction(
      buildActionWithClose(
        buildPrimaryNavigationLogoutAction({
          fallbackCopy,
          isLoggingOut,
          mobileNavItemClassName,
          onLogout: props.onLogout,
        }),
        onActionClick
      )
    );
  }

  return (
    <KangurPrimaryNavigationGuestAuthActions
      onActionClick={onActionClick}
    />
  );
}

export function KangurPrimaryNavigationPrimaryActions({
  onActionClick,
  wrapperClassName,
}: {
  onActionClick?: () => void;
  wrapperClassName?: string;
}): React.JSX.Element {
  const { isTutorHidden, derived } = useKangurPrimaryNavigationContext();
  const {
    homeAction,
    canAccessGamesLibrary,
    gamesLibraryAction,
    lessonsAction,
    duelsAction,
    subjectAction,
    ageGroupAction,
    tutorToggleAction,
    inlineAppearanceWithTutor,
  } = derived;

  const tutorInlineClassName = [tutorToggleAction.className, 'max-sm:!w-auto']
    .filter(Boolean)
    .join(' ');
  const tutorInlineAction = renderNavAction(
    buildActionWithClose(
      {
        ...tutorToggleAction,
        className: tutorInlineClassName,
      },
      onActionClick
    )
  );
  const tutorDefaultAction = renderNavAction(
    buildActionWithClose(tutorToggleAction, onActionClick)
  );

  let tutorRow: React.ReactNode = null;

  if (!isTutorHidden) {
    tutorRow = inlineAppearanceWithTutor ? (
      <div className='flex w-full items-center justify-center gap-2'>
        {tutorInlineAction}
        <KangurPrimaryNavigationInlineAppearanceMount />
      </div>
    ) : tutorDefaultAction;
  }

  return (
    <div
      className={
        wrapperClassName ??
        'grid w-full min-w-0 grid-cols-2 gap-2 max-[420px]:grid-cols-1 sm:flex sm:w-auto sm:flex-nowrap sm:items-center'
      }
      data-testid='kangur-primary-nav-primary-actions'
    >
      {renderNavAction(buildActionWithClose(homeAction, onActionClick))}
      {canAccessGamesLibrary
        ? renderNavAction(buildActionWithClose(gamesLibraryAction, onActionClick))
        : null}
      {renderNavAction(buildActionWithClose(lessonsAction, onActionClick))}
      {renderNavAction(buildActionWithClose(duelsAction, onActionClick))}
      {renderNavAction(buildActionWithClose(subjectAction, onActionClick))}
      {renderNavAction(buildActionWithClose(ageGroupAction, onActionClick))}
      {tutorRow}
    </div>
  );
}

export function KangurPrimaryNavigationUtilityActions({
  authActions,
  rightAccessory,
  onActionClick,
  testId = 'kangur-primary-nav-utility-actions',
  wrapperClassName,
  hideAppearanceControls,
  hideLanguageSwitcher,
}: {
  authActions: React.ReactNode;
  rightAccessory: React.ReactNode;
  onActionClick?: () => void;
  testId?: string;
  wrapperClassName?: string;
  hideAppearanceControls?: boolean;
  hideLanguageSwitcher?: boolean;
}): React.ReactNode {
  const {
    authUser,
    effectiveIsAuthenticated,
    elevatedSessionSnapshot,
    fallbackCopy,
    isCoarsePointer,
    props,
    derived,
  } = useKangurPrimaryNavigationContext();

  const {
    shouldRenderLanguageSwitcher,
    basePath,
    mobileNavItemClassName,
    parentDashboardAction,
  } = derived;
  const accessibleCurrentPage = props.currentPage;
  const forceLanguageSwitcherFallbackPath =
    props.forceLanguageSwitcherFallbackPath ?? false;
  const { shouldRenderElevatedUserMenu, shouldRenderProfileMenu } =
    resolvePrimaryNavigationDeferredMenuState({
      authUser,
      effectiveIsAuthenticated,
      elevatedSessionSnapshot,
    });
  const shouldRequestAppearanceControls = hideAppearanceControls !== true;
  const shouldRenderDeferredUtilityMount =
    shouldRenderLanguageSwitcher ||
    shouldRequestAppearanceControls ||
    shouldRenderElevatedUserMenu ||
    shouldRenderProfileMenu;

  if (
    !(
      shouldRenderDeferredUtilityMount ||
      (rightAccessory !== null && rightAccessory !== undefined) ||
      parentDashboardAction ||
      (authActions !== null && authActions !== undefined)
    )
  ) {
    return null;
  }

  return (
    <div
      className={
        wrapperClassName ??
        'ml-auto flex items-stretch justify-end gap-2 max-sm:ml-0 max-sm:justify-start sm:w-auto sm:flex-wrap sm:items-center'
      }
      data-testid={testId}
    >
      {shouldRenderDeferredUtilityMount ? (
        <KangurPrimaryNavigationDeferredUtilityMount
          authUser={authUser}
          basePath={basePath}
          currentPage={accessibleCurrentPage}
          elevatedSessionSnapshot={elevatedSessionSnapshot}
          fallbackCopy={fallbackCopy}
          forceLanguageSwitcherFallbackPath={forceLanguageSwitcherFallbackPath}
          isCoarsePointer={isCoarsePointer}
          mobileNavItemClassName={mobileNavItemClassName}
          onLogout={props.onLogout}
          profileTransitionSourceId={KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.profile}
          shouldRenderElevatedUserMenu={shouldRenderElevatedUserMenu}
          shouldRequestAppearanceControls={shouldRequestAppearanceControls}
          shouldRenderLanguageSwitcher={shouldRenderLanguageSwitcher && hideLanguageSwitcher !== true}
          shouldRenderProfileMenu={shouldRenderProfileMenu}
        />
      ) : null}
      {rightAccessory}
      {resolveUtilityParentDashboardNode({ onActionClick, parentDashboardAction })}
      {authActions}
    </div>
  );
}
