'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { LogOut } from 'lucide-react';

import { useKangurDeferredStandaloneHomeReady } from '@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { GAME_HOME_UTILITY_IDLE_DELAY_MS } from '@/features/kangur/ui/pages/GameHome.constants';

import {
  KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS,
  useKangurPrimaryNavigationContext,
} from './KangurPrimaryNavigation.context';
import { ICON_CLASSNAME, renderNavAction } from './KangurPrimaryNavigation.utils';

const KangurPrimaryNavigationDeferredUtilityRuntime = dynamic(() =>
  import('./KangurPrimaryNavigation.deferred-utility-runtime').then((m) => ({
    default: m.KangurPrimaryNavigationDeferredUtilityRuntime,
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

function resolveKangurPrimaryNavigationLoginCopy({
  fallbackLabel,
  loginActionContent,
}: {
  fallbackLabel: string;
  loginActionContent: ReturnType<typeof useKangurPageContentEntry>['entry'];
}): {
  loginLabel: string;
  loginTitle: string | undefined;
} {
  const resolvedLoginLabel = loginActionContent ? loginActionContent.title.trim() : '';
  const resolvedLoginTitle = loginActionContent ? loginActionContent.summary.trim() : '';

  return {
    loginLabel: resolvedLoginLabel.length > 0 ? resolvedLoginLabel : fallbackLabel,
    loginTitle: resolvedLoginTitle.length > 0 ? resolvedLoginTitle : undefined,
  };
}

function KangurPrimaryNavigationLoginAction({
  className,
  fallbackLabel,
  loginActionRef,
  onActionClick,
  onLogin,
}: {
  className?: string;
  fallbackLabel: string;
  loginActionRef: React.RefObject<HTMLButtonElement | null>;
  onActionClick?: () => void;
  onLogin: () => void;
}): React.JSX.Element {
  const shouldLoadLoginActionContent = useKangurDeferredStandaloneHomeReady({
    minimumDelayMs: GAME_HOME_UTILITY_IDLE_DELAY_MS,
  });
  const { entry: loginActionContent } = useKangurPageContentEntry(
    'shared-nav-login-action',
    undefined,
    {
      enabled: shouldLoadLoginActionContent,
    }
  );
  const { loginLabel, loginTitle } = resolveKangurPrimaryNavigationLoginCopy({
    fallbackLabel,
    loginActionContent,
  });

  return renderNavAction(
    buildActionWithClose(
      {
        content: <span className='truncate'>{loginLabel}</span>,
        docId: 'auth_login',
        ariaLabel: loginLabel,
        onClick: onLogin,
        elementRef: loginActionRef,
        className,
        testId: 'kangur-primary-nav-login',
        title: loginTitle,
      },
      onActionClick
    )
  );
}

function KangurPrimaryNavigationGuestPlayerNameAction({
  commitGuestPlayerName,
  fallbackCopy,
  guestPlayerName,
  guestPlayerNameValue,
  guestPlayerPlaceholderText,
  handleGuestPlayerNameChange,
  hasGuestPlayerName,
  isEditingGuestPlayerName,
  setIsEditingGuestPlayerName,
}: {
  commitGuestPlayerName: () => void;
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationContext>['fallbackCopy'];
  guestPlayerName?: string;
  guestPlayerNameValue: string;
  guestPlayerPlaceholderText: string;
  handleGuestPlayerNameChange: (value: string) => void;
  hasGuestPlayerName: boolean;
  isEditingGuestPlayerName: boolean;
  setIsEditingGuestPlayerName: (value: boolean) => void;
}): React.JSX.Element {
  if (isEditingGuestPlayerName) {
    return (
      <form
        className='flex items-center'
        onSubmit={(e) => {
          e.preventDefault();
          commitGuestPlayerName();
        }}
      >
        <input
          aria-label={fallbackCopy.guestPlayerNameLabel}
          autoFocus
          className='kangur-text-field h-10 min-h-0 w-44 rounded-xl px-3.5 py-0 text-sm font-semibold text-slate-600 sm:w-48'
          onChange={(e) => handleGuestPlayerNameChange(e.target.value)}
          onBlur={() => commitGuestPlayerName()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsEditingGuestPlayerName(false);
              return;
            }

            if (e.key === 'Enter') {
              e.preventDefault();
              commitGuestPlayerName();
            }
          }}
          placeholder={guestPlayerPlaceholderText}
          style={
            {
              '--kangur-input-height': '40px',
              '--kangur-text-field-background': 'rgba(255, 255, 255, 0.88)',
              '--kangur-text-field-border': 'rgba(226, 232, 240, 0.78)',
              '--kangur-text-field-focus-border': 'rgba(203, 213, 225, 0.9)',
              '--kangur-text-field-focus-ring': 'transparent',
              '--kangur-text-field-placeholder': 'rgba(148, 163, 184, 0.95)',
              '--kangur-text-field-text': '#475569',
            } as React.CSSProperties
          }
          type='text'
          value={guestPlayerNameValue}
        />
      </form>
    );
  }

  return (
    <button
      aria-label={hasGuestPlayerName ? guestPlayerName : fallbackCopy.guestPlayerNameLabel}
      className='flex h-10 items-center gap-2 rounded-xl border border-sky-100 bg-white/80 px-3 py-2 transition hover:bg-white active:scale-95 sm:h-11'
      onClick={() => setIsEditingGuestPlayerName(true)}
      type='button'
    >
      <span aria-hidden='true' className='text-lg'>👤</span>
      <span className='text-xs font-black uppercase tracking-wider text-sky-800'>
        {hasGuestPlayerName ? guestPlayerName : fallbackCopy.guestPlayerNameLabel}
      </span>
    </button>
  );
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

export function KangurPrimaryNavigationAuthActions({
  onActionClick,
}: {
  onActionClick?: () => void;
}): React.ReactNode {
  const {
    effectiveIsAuthenticated,
    fallbackCopy,
    isLoggingOut,
    loginActionRef,
    props,
    derived,
    commitGuestPlayerName,
    guestPlayerNameValue,
    guestPlayerPlaceholderText,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    isEditingGuestPlayerName,
    setIsEditingGuestPlayerName,
    showGuestPlayerNameInput,
  } = useKangurPrimaryNavigationContext();

  const { mobileNavItemClassName } = derived;
  const { guestPlayerName, onLogin } = props;

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

  if (!onLogin && !showGuestPlayerNameInput) {
    return null;
  }

  return (
    <>
      {showGuestPlayerNameInput ? (
        <KangurPrimaryNavigationGuestPlayerNameAction
          commitGuestPlayerName={commitGuestPlayerName}
          fallbackCopy={fallbackCopy}
          guestPlayerName={guestPlayerName}
          guestPlayerNameValue={guestPlayerNameValue}
          guestPlayerPlaceholderText={guestPlayerPlaceholderText}
          handleGuestPlayerNameChange={handleGuestPlayerNameChange}
          hasGuestPlayerName={hasGuestPlayerName}
          isEditingGuestPlayerName={isEditingGuestPlayerName}
          setIsEditingGuestPlayerName={setIsEditingGuestPlayerName}
        />
      ) : null}
      {onLogin ? (
        <KangurPrimaryNavigationLoginAction
          className={mobileNavItemClassName}
          fallbackLabel={fallbackCopy.loginLabel}
          loginActionRef={loginActionRef}
          onActionClick={onActionClick}
          onLogin={onLogin}
        />
      ) : null}
    </>
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
    appearanceControlsInline,
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
  const shouldRenderInlineTutorAppearance =
    inlineAppearanceWithTutor &&
    appearanceControlsInline !== null &&
    appearanceControlsInline !== undefined;

  let tutorRow: React.ReactNode = null;

  if (!isTutorHidden) {
    tutorRow = shouldRenderInlineTutorAppearance ? (
      <div className='flex w-full items-center justify-center gap-2'>
        {tutorInlineAction}
        <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
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
    activeLearner,
    authUser,
    elevatedSessionSnapshot,
    fallbackCopy,
    isCoarsePointer,
    shouldRenderElevatedUserMenu,
    shouldRenderProfileMenu,
    props,
    derived,
  } = useKangurPrimaryNavigationContext();

  const {
    appearanceControls,
    shouldRenderLanguageSwitcher,
    basePath,
    mobileNavItemClassName,
    parentDashboardAction,
  } = derived;
  const isStandaloneHomeUtilityReady = useKangurDeferredStandaloneHomeReady({
    minimumDelayMs: GAME_HOME_UTILITY_IDLE_DELAY_MS,
  });

  const accessibleCurrentPage = props.currentPage;
  const forceLanguageSwitcherFallbackPath =
    props.forceLanguageSwitcherFallbackPath ?? false;
  const learnerProfileIsActive = accessibleCurrentPage === 'LearnerProfile';

  const resolvedAppearanceControls = hideAppearanceControls === true ? null : appearanceControls;
  const resolvedShouldRenderElevatedUserMenu =
    shouldRenderElevatedUserMenu && isStandaloneHomeUtilityReady;
  const resolvedShouldRenderLanguageSwitcher =
    shouldRenderLanguageSwitcher &&
    hideLanguageSwitcher !== true &&
    isStandaloneHomeUtilityReady;
  const resolvedShouldRenderProfileMenu =
    shouldRenderProfileMenu && isStandaloneHomeUtilityReady;
  const shouldRenderDeferredUtilityRuntime =
    resolvedShouldRenderLanguageSwitcher ||
    Boolean(resolvedAppearanceControls) ||
    resolvedShouldRenderElevatedUserMenu ||
    resolvedShouldRenderProfileMenu;

  if (
    !(
      shouldRenderDeferredUtilityRuntime ||
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
      {shouldRenderDeferredUtilityRuntime ? (
        <KangurPrimaryNavigationDeferredUtilityRuntime
          activeLearner={activeLearner}
          accessibleCurrentPage={accessibleCurrentPage}
          appearanceControls={resolvedAppearanceControls}
          authUser={authUser}
          basePath={basePath}
          elevatedSessionSnapshot={elevatedSessionSnapshot}
          fallbackCopy={fallbackCopy}
          forceLanguageSwitcherFallbackPath={forceLanguageSwitcherFallbackPath}
          isCoarsePointer={isCoarsePointer}
          learnerProfileIsActive={learnerProfileIsActive}
          mobileNavItemClassName={mobileNavItemClassName}
          onLogout={props.onLogout}
          profileTransitionSourceId={KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.profile}
          shouldRenderElevatedUserMenu={resolvedShouldRenderElevatedUserMenu}
          shouldRenderLanguageSwitcher={resolvedShouldRenderLanguageSwitcher}
          shouldRenderProfileMenu={resolvedShouldRenderProfileMenu}
        />
      ) : null}
      {rightAccessory}
      {resolveUtilityParentDashboardNode({ onActionClick, parentDashboardAction })}
      {authActions}
    </div>
  );
}
