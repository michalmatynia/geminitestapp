'use client';

import React from 'react';

import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import {
  KangurButton,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_TIGHT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';

import {
  KangurPrimaryNavigationLoginAction,
} from './KangurPrimaryNavigation.components';
import {
  useKangurPrimaryNavigationState,
} from './KangurPrimaryNavigation.hooks';
import {
  buildActionWithClose,
  buildPrimaryNavigationLogoutAction,
  resolveKangurPrimaryNavigationUtilityVisibility,
  resolveUtilityElevatedUserMenuNode,
  resolveUtilityLanguageSwitcherNode,
  resolveUtilityParentDashboardNode,
  resolveUtilityProfileMenuNode,
} from './KangurPrimaryNavigation.utility-runtime';
import type {
  KangurNavActionConfig,
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
import { renderNavAction } from './KangurPrimaryNavigation.utils';

export const buildSubjectOptions = ({
  availableSubjects,
  isSixYearOld,
  normalizedLocale,
  setSubject,
  subject,
}: {
  availableSubjects: ReturnType<
    typeof import('@/features/kangur/lessons/lesson-catalog-metadata').getKangurSubjectsForAgeGroup
  >;
  isSixYearOld: boolean;
  normalizedLocale: string;
  setSubject: ReturnType<typeof useKangurPrimaryNavigationState>['setSubject'];
  subject: ReturnType<typeof useKangurPrimaryNavigationState>['subject'];
}) =>
  availableSubjects.map((item) => ({
    ariaLabel: getLocalizedKangurSubjectLabel(item.id, normalizedLocale, item.label),
    id: item.id,
    label: isSixYearOld ? (
      <KangurVisualCueContent
        detail={getKangurSixYearOldSubjectVisual(item.id).detail}
        detailClassName='text-sm font-bold'
        detailTestId={`kangur-primary-nav-subject-option-detail-${item.id}`}
        icon={getKangurSixYearOldSubjectVisual(item.id).icon}
        iconClassName='text-lg'
        iconTestId={`kangur-primary-nav-subject-option-icon-${item.id}`}
        label={getLocalizedKangurSubjectLabel(item.id, normalizedLocale, item.label)}
      />
    ) : (
      getLocalizedKangurSubjectLabel(item.id, normalizedLocale, item.label)
    ),
    isActive: subject === item.id,
    onSelect: () => setSubject(item.id),
  }));

export const buildAgeGroupOptions = ({
  ageGroup,
  isSixYearOld,
  normalizedLocale,
  setAgeGroup,
}: {
  ageGroup: ReturnType<typeof useKangurPrimaryNavigationState>['ageGroup'];
  isSixYearOld: boolean;
  normalizedLocale: string;
  setAgeGroup: ReturnType<typeof useKangurPrimaryNavigationState>['setAgeGroup'];
}) =>
  KANGUR_AGE_GROUPS.map((group) => ({
    ariaLabel: getLocalizedKangurAgeGroupLabel(group.id, normalizedLocale, group.label),
    id: group.id,
    label: isSixYearOld ? (
      <KangurVisualCueContent
        detail={getKangurSixYearOldAgeGroupVisual(group.id).detail}
        detailClassName='text-sm font-bold'
        detailTestId={`kangur-primary-nav-age-group-option-detail-${group.id}`}
        icon={getKangurSixYearOldAgeGroupVisual(group.id).icon}
        iconClassName='text-lg'
        iconTestId={`kangur-primary-nav-age-group-option-icon-${group.id}`}
        label={getLocalizedKangurAgeGroupLabel(group.id, normalizedLocale, group.label)}
      />
    ) : (
      getLocalizedKangurAgeGroupLabel(group.id, normalizedLocale, group.label)
    ),
    isActive: ageGroup === group.id,
    onSelect: () => setAgeGroup(group.id),
  }));

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
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  guestPlayerName?: string;
  guestPlayerNameValue: string;
  guestPlayerPlaceholderText: string;
  handleGuestPlayerNameChange: (value: string) => void;
  hasGuestPlayerName: boolean;
  isEditingGuestPlayerName: boolean;
  setIsEditingGuestPlayerName: React.Dispatch<React.SetStateAction<boolean>>;
}): React.JSX.Element {
  if (isEditingGuestPlayerName || !hasGuestPlayerName) {
    return (
      <div className='w-full sm:w-[220px]'>
        <label className='sr-only' htmlFor='kangur-primary-nav-guest-player-name'>
          {fallbackCopy.guestPlayerNameLabel}
        </label>
        <KangurTextField
          accent='indigo'
          className='h-11 min-w-0 text-sm'
          data-doc-id='profile_guest_player_name'
          id='kangur-primary-nav-guest-player-name'
          maxLength={20}
          onBlur={commitGuestPlayerName}
          onChange={(event) => handleGuestPlayerNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitGuestPlayerName();
            }
          }}
          placeholder={guestPlayerPlaceholderText}
          size='md'
          type='text'
          value={guestPlayerNameValue}
        />
      </div>
    );
  }

  return (
    <KangurButton
      className='w-full justify-start px-3 text-left sm:w-auto sm:min-w-[180px]'
      data-doc-id='profile_guest_player_name_display'
      onClick={() => setIsEditingGuestPlayerName(true)}
      size='md'
      type='button'
      variant='navigation'
    >
      <span className='truncate'>{guestPlayerName?.trim()}</span>
    </KangurButton>
  );
}

export function KangurPrimaryNavigationAuthActions({
  commitGuestPlayerName,
  effectiveIsAuthenticated,
  fallbackCopy,
  guestPlayerName,
  guestPlayerNameValue,
  guestPlayerPlaceholderText,
  handleGuestPlayerNameChange,
  hasGuestPlayerName,
  isEditingGuestPlayerName,
  isLoggingOut,
  loginActionRef,
  mobileNavItemClassName,
  onActionClick,
  onLogin,
  onLogout,
  setIsEditingGuestPlayerName,
  showGuestPlayerNameInput,
}: {
  commitGuestPlayerName: () => void;
  effectiveIsAuthenticated: boolean;
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  guestPlayerName?: string;
  guestPlayerNameValue: string;
  guestPlayerPlaceholderText: string;
  handleGuestPlayerNameChange: (value: string) => void;
  hasGuestPlayerName: boolean;
  isEditingGuestPlayerName: boolean;
  isLoggingOut: boolean;
  loginActionRef: React.RefObject<HTMLButtonElement | null>;
  mobileNavItemClassName: string;
  onActionClick?: () => void;
  onLogin?: () => void;
  onLogout: () => void;
  setIsEditingGuestPlayerName: React.Dispatch<React.SetStateAction<boolean>>;
  showGuestPlayerNameInput: boolean;
}): React.ReactNode {
  if (effectiveIsAuthenticated) {
    return renderNavAction(
      buildActionWithClose(
        buildPrimaryNavigationLogoutAction({
          fallbackCopy,
          isLoggingOut,
          mobileNavItemClassName,
          onLogout,
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
  appearanceControlsInline,
  canAccessGamesLibrary,
  gamesLibraryAction,
  homeAction,
  inlineAppearanceWithTutor,
  isTutorHidden,
  leading,
  lessonsAction,
  onActionClick,
  subjectAction,
  ageGroupAction,
  duelsAction,
  tutorToggleAction,
  wrapperClassName,
}: {
  appearanceControlsInline: React.ReactNode;
  ageGroupAction: KangurNavActionConfig;
  canAccessGamesLibrary: boolean;
  duelsAction: KangurNavActionConfig;
  gamesLibraryAction: KangurNavActionConfig;
  homeAction: KangurNavActionConfig;
  inlineAppearanceWithTutor?: boolean;
  isTutorHidden: boolean;
  leading?: React.ReactNode;
  lessonsAction: KangurNavActionConfig;
  onActionClick?: () => void;
  subjectAction: KangurNavActionConfig;
  tutorToggleAction: KangurNavActionConfig;
  wrapperClassName?: string;
}): React.JSX.Element {
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
  const tutorRow = isTutorHidden
    ? null
    : inlineAppearanceWithTutor && appearanceControlsInline
      ? (
          <div className='flex w-full items-center justify-center gap-2'>
            {tutorInlineAction}
            <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
          </div>
        )
      : tutorDefaultAction;

  return (
    <div
      className={
        wrapperClassName ??
        'grid w-full min-w-0 grid-cols-2 gap-2 max-[420px]:grid-cols-1 sm:flex sm:w-auto sm:flex-nowrap sm:items-center'
      }
      data-testid='kangur-primary-nav-primary-actions'
    >
      {leading}
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
  accessibleCurrentPage,
  appearanceControls,
  authActions,
  basePath,
  elevatedSessionUser,
  fallbackCopy,
  forceLanguageSwitcherFallbackPath,
  hideAppearanceControls,
  hideLanguageSwitcher,
  isCoarsePointer,
  learnerProfileIsActive,
  mobileNavItemClassName,
  onActionClick,
  onLogout,
  parentDashboardAction,
  profileAvatar,
  profileHref,
  profileLabel,
  profileTransitionSourceId,
  rightAccessory,
  shouldRenderElevatedUserMenu,
  shouldRenderLanguageSwitcher,
  shouldRenderProfileMenu,
  testId = 'kangur-primary-nav-utility-actions',
  wrapperClassName,
}: {
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
  appearanceControls: React.ReactNode;
  authActions: React.ReactNode;
  basePath: string;
  elevatedSessionUser: ReturnType<typeof useKangurPrimaryNavigationState>['elevatedSessionUser'];
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  forceLanguageSwitcherFallbackPath: boolean;
  hideAppearanceControls?: boolean;
  hideLanguageSwitcher?: boolean;
  isCoarsePointer: boolean;
  learnerProfileIsActive: boolean;
  mobileNavItemClassName: string;
  onActionClick?: () => void;
  onLogout: () => void;
  parentDashboardAction: KangurNavActionConfig | null;
  profileAvatar: ReturnType<typeof useKangurPrimaryNavigationState>['profileAvatar'];
  profileHref: string;
  profileLabel: string;
  profileTransitionSourceId: string;
  rightAccessory: React.ReactNode;
  shouldRenderElevatedUserMenu: boolean;
  shouldRenderLanguageSwitcher: boolean;
  shouldRenderProfileMenu: boolean;
  testId?: string;
  wrapperClassName?: string;
}): React.ReactNode {
  const resolvedAppearanceControls = hideAppearanceControls ? null : appearanceControls;
  const resolvedShouldRenderLanguageSwitcher =
    shouldRenderLanguageSwitcher && !hideLanguageSwitcher;

  if (
    !resolveKangurPrimaryNavigationUtilityVisibility({
      authActions,
      parentDashboardAction,
      resolvedAppearanceControls,
      resolvedShouldRenderLanguageSwitcher,
      rightAccessory,
      shouldRenderElevatedUserMenu,
      shouldRenderProfileMenu,
    })
  ) {
    return null;
  }

  return (
    <div
      className={
        wrapperClassName ??
        `ml-auto ${KANGUR_TIGHT_ROW_CLASSNAME} items-stretch justify-end max-sm:ml-0 max-sm:justify-start sm:w-auto sm:flex-wrap sm:items-center`
      }
      data-testid={testId}
    >
      {resolveUtilityLanguageSwitcherNode({
        accessibleCurrentPage,
        basePath,
        forceLanguageSwitcherFallbackPath,
        mobileNavItemClassName,
        resolvedShouldRenderLanguageSwitcher,
      })}
      {resolvedAppearanceControls}
      {rightAccessory}
      {resolveUtilityParentDashboardNode({ onActionClick, parentDashboardAction })}
      {resolveUtilityElevatedUserMenuNode({
        elevatedSessionUser,
        fallbackCopy,
        isCoarsePointer,
        onLogout,
        shouldRenderElevatedUserMenu,
      })}
      {resolveUtilityProfileMenuNode({
        learnerProfileIsActive,
        mobileNavItemClassName,
        profileAvatar,
        profileHref,
        profileLabel,
        profileTransitionSourceId,
        shouldRenderProfileMenu,
      })}
      {authActions}
    </div>
  );
}
