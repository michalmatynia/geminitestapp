'use client';

import {
  BookCheck,
  BrainCircuit,
  LayoutGrid,
  LogOut,
  Menu,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { Suspense, useMemo, useRef, useState } from 'react';

import { CmsStorefrontAppearanceButtons } from '@/features/cms/public';
import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import {
  persistTutorVisibilityHidden,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
const KangurChoiceDialog = dynamic(() =>
  import('@/features/kangur/ui/components/KangurChoiceDialog').then((m) => ({
    default: function KangurChoiceDialogEntry(
      props: import('@/features/kangur/ui/components/KangurChoiceDialog').KangurChoiceDialogProps
    ) {
      return m.renderKangurChoiceDialog(props);
    },
  }))
);
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
const KangurElevatedUserMenu = dynamic(() =>
  import('@/features/kangur/ui/components/KangurElevatedUserMenu').then((m) => ({
    default: m.KangurElevatedUserMenu,
  }))
);
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTextField,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_AGE_GROUPS,
  getKangurDefaultSubjectForAgeGroup,
  getKangurSubjectsForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog-metadata';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import { LoadingState } from '@/features/kangur/shared/ui';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import type {
  KangurNavActionConfig,
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
export type {
  KangurNavActionConfig,
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
import {
  ICON_CLASSNAME,
  PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS,
  isTransitionSourceActive,
  renderNavAction,
  renderLessonsNavActionContent,
  renderGamesLibraryNavActionContent,
} from './KangurPrimaryNavigation.utils';
import { useKangurPrimaryNavigationState } from './KangurPrimaryNavigation.hooks';
import {
  KangurHomeBetaBadge,
  KangurPrimaryNavigationLoginAction,
} from './KangurPrimaryNavigation.components';

const KangurLanguageSwitcher = dynamic(() =>
  import('@/features/kangur/ui/components/KangurLanguageSwitcher').then(m => ({ default: m.KangurLanguageSwitcher }))
);

const resolveTutorFallbackCopy = (
  locale: string,
  value: string | null | undefined,
  polishDefault: string,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  if (locale !== 'pl' && value === polishDefault) return fallback;
  return value;
};

export function KangurPrimaryNavigation(props: KangurPrimaryNavigationProps): React.JSX.Element {
  const state = useKangurPrimaryNavigationState(props);
  const {
    authUser,
    elevatedSessionUser,
    isSuperAdmin,
    isLoggingOut,
    effectiveIsAuthenticated,
    profileAvatar,
    shouldRenderElevatedUserMenu,
    shouldRenderProfileMenu,
    isTutorHidden,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSubjectModalOpen,
    setIsSubjectModalOpen,
    isAgeGroupModalOpen,
    setIsAgeGroupModalOpen,
    subject,
    setSubject,
    ageGroup,
    setAgeGroup,
    isMobileViewport,
    isCoarsePointer,
    closeMobileMenu,
    toggleMobileMenu,
    fallbackCopy,
    navigationLabel,
    navTranslations,
    tutorContent,
    tutor,
    routeTransitionState,
    normalizedLocale,
    queryClient,
    kangurAppearance,
    effectiveShowParentDashboard,
  } = state;

  const {
    basePath,
    currentPage,
    forceLanguageSwitcherFallbackPath = false,
    guestPlayerName,
    guestPlayerNamePlaceholder,
    homeActive,
    onHomeClick,
    onLogin,
    onLogout,
    rightAccessory,
  } = props;

  const loginActionRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const guestPlayerNameValue = typeof guestPlayerName === 'string' ? guestPlayerName : '';
  const guestPlayerPlaceholderText = guestPlayerNamePlaceholder ?? fallbackCopy.guestPlayerNamePlaceholder;
  const accessibleCurrentPage = currentPage;
  const effectiveHomeActive = homeActive ?? accessibleCurrentPage === 'Game';
  const hasGuestPlayerName = (guestPlayerName?.trim() ?? '').length > 0;
  const isParentAccount = authUser?.actorType === 'parent';
  const hasActiveLearner = Boolean(authUser?.activeLearner?.id);
  const canAccessGamesLibrary = effectiveIsAuthenticated && isSuperAdmin;
  const profileDisplayName = authUser?.activeLearner?.displayName?.trim() || authUser?.activeLearner?.loginName?.trim() || authUser?.full_name?.trim() || null;
  const profileLabel = profileDisplayName ? fallbackCopy.profileLabelWithName(profileDisplayName) : fallbackCopy.profileLabel;
  const showGuestPlayerNameInput = !effectiveIsAuthenticated && typeof guestPlayerName === 'string' && typeof props.onGuestPlayerNameChange === 'function';

  const homeHref = getKangurHomeHref(basePath);
  const gamesLibraryHref = createPageUrl('GamesLibrary', basePath);
  const lessonsHref = createPageUrl('Lessons', basePath);
  const duelsHref = createPageUrl('Duels', basePath);
  const parentDashboardHref = createPageUrl('ParentDashboard', basePath);
  const profileHref = createPageUrl('LearnerProfile', basePath);

  const transitionPhase = routeTransitionState?.transitionPhase ?? 'idle';
  const activeTransitionSourceId = routeTransitionState?.activeTransitionSourceId ?? null;
  const subjectDialogId = 'kangur-primary-nav-subject-dialog';
  const ageGroupDialogId = 'kangur-primary-nav-age-group-dialog';
  const homeTransitionSourceId = 'kangur-primary-nav:home';
  const gamesLibraryTransitionSourceId = 'kangur-primary-nav:games-library';
  const lessonsTransitionSourceId = 'kangur-primary-nav:lessons';
  const duelsTransitionSourceId = 'kangur-primary-nav:duels';
  const profileTransitionSourceId = 'kangur-primary-nav:profile';
  const parentDashboardTransitionSourceId = 'kangur-primary-nav:parent-dashboard';

  const isSixYearOld = ageGroup === 'six_year_old';
  const subjectChoiceLabel = getLocalizedKangurSubjectLabel(subject, normalizedLocale);
  const ageGroupChoiceLabel = getLocalizedKangurAgeGroupLabel(ageGroup, normalizedLocale);
  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);
  const ageGroupVisual = getKangurSixYearOldAgeGroupVisual(ageGroup);
  const availableSubjects = useMemo(() => getKangurSubjectsForAgeGroup(ageGroup), [ageGroup]);
  const subjectOptions = useMemo(
    () =>
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
      })),
    [availableSubjects, isSixYearOld, normalizedLocale, setSubject, subject]
  );

  const ageGroupOptions = useMemo(
    () =>
      KANGUR_AGE_GROUPS.map((group) => ({
        ariaLabel: getLocalizedKangurAgeGroupLabel(group.id, normalizedLocale),
        id: group.id,
        label: isSixYearOld ? (
          <KangurVisualCueContent
            detail={getKangurSixYearOldAgeGroupVisual(group.id).detail}
            detailClassName='text-sm font-bold'
            detailTestId={`kangur-primary-nav-age-group-option-detail-${group.id}`}
            icon={getKangurSixYearOldAgeGroupVisual(group.id).icon}
            iconClassName='text-lg'
            iconTestId={`kangur-primary-nav-age-group-option-icon-${group.id}`}
            label={getLocalizedKangurAgeGroupLabel(group.id, normalizedLocale)}
          />
        ) : (
          getLocalizedKangurAgeGroupLabel(group.id, normalizedLocale)
        ),
        isActive: ageGroup === group.id,
        onSelect: () => setAgeGroup(group.id),
      })),
    [ageGroup, isSixYearOld, normalizedLocale, setAgeGroup]
  );

  const enableTutorLabel = resolveTutorFallbackCopy(
    normalizedLocale,
    tutorContent.common.enableTutorLabel ?? tutorContent.navigation.restoreTutorLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.enableTutorLabel,
    fallbackCopy.enableTutorLabel
  );
  const disableTutorLabel = resolveTutorFallbackCopy(
    normalizedLocale,
    tutorContent.common.disableTutorAria,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.disableTutorAria,
    fallbackCopy.disableTutorLabel
  );

  const mobileNavItemClassName = `max-sm:col-span-1 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
  const mobileWideNavItemClassName = `max-sm:col-span-2 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
  const yellowPillActionClassName = `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`;
  const amberPillActionClassName = `border-amber-300/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.96)_0%,rgba(253,230,138,0.92)_100%)] px-4 text-amber-800 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.58)] ring-1 ring-amber-200/90 hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(253,230,138,0.94)_100%)] hover:text-amber-900 ${mobileWideNavItemClassName}`;

  const renderPrimaryNavActions = (onActionClick?: () => void) => (
    <>
      {renderNavAction({
        active: effectiveHomeActive,
        className: `px-3 sm:px-4 ${mobileNavItemClassName}`,
        content: (
          <span className='flex flex-col items-center justify-center' data-testid='kangur-home-brand'>
            <span className='flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none' data-testid='kangur-home-logo'>
              <KangurHomeLogo idPrefix='kangur-primary-nav-logo' className='-translate-y-[1px]' />
            </span>
            <KangurHomeBetaBadge />
          </span>
        ),
        docId: 'top_nav_home',
        href: onHomeClick ? undefined : homeHref,
        onClick: () => {
          onHomeClick?.();
          onActionClick?.();
        },
        testId: 'kangur-primary-nav-home',
        transition: {
          active: isTransitionSourceActive({ activeTransitionSourceId, transitionPhase, transitionSourceId: homeTransitionSourceId }),
          acknowledgeMs: onHomeClick ? undefined : PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS,
          sourceId: onHomeClick ? undefined : homeTransitionSourceId,
        },
      })}

      {canAccessGamesLibrary && renderNavAction({
        active: accessibleCurrentPage === 'GamesLibrary',
        className: mobileNavItemClassName,
        content: renderGamesLibraryNavActionContent({ isSixYearOld, label: navTranslations('gamesLibrary') }),
        docId: 'top_nav_games_library',
        href: gamesLibraryHref,
        onClick: onActionClick,
        testId: 'kangur-primary-nav-games-library',
        transition: {
          active: isTransitionSourceActive({ activeTransitionSourceId, transitionPhase, transitionSourceId: gamesLibraryTransitionSourceId }),
          sourceId: gamesLibraryTransitionSourceId,
        },
      })}

      {renderNavAction({
        active: accessibleCurrentPage === 'Lessons',
        className: mobileNavItemClassName,
        content: renderLessonsNavActionContent({ isSixYearOld, label: navTranslations('lessons') }),
        docId: 'top_nav_lessons',
        href: lessonsHref,
        onClick: onActionClick,
        testId: 'kangur-primary-nav-lessons',
        transition: {
          active: isTransitionSourceActive({ activeTransitionSourceId, transitionPhase, transitionSourceId: lessonsTransitionSourceId }),
          sourceId: lessonsTransitionSourceId,
        },
      })}

      {renderNavAction({
        active: accessibleCurrentPage === 'Duels',
        className: mobileNavItemClassName,
        content: (
          <>
            <Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span className='truncate'>{navTranslations('duels')}</span>
          </>
        ),
        docId: 'top_nav_duels',
        href: duelsHref,
        onClick: onActionClick,
        testId: 'kangur-primary-nav-duels',
        transition: {
          active: isTransitionSourceActive({ activeTransitionSourceId, transitionPhase, transitionSourceId: duelsTransitionSourceId }),
          sourceId: duelsTransitionSourceId,
        },
      })}

      {effectiveShowParentDashboard && renderNavAction({
        active: accessibleCurrentPage === 'ParentDashboard',
        className: mobileNavItemClassName,
        content: (
          <>
            <LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span className='truncate'>{navTranslations('parentDashboard')}</span>
          </>
        ),
        docId: 'top_nav_parent_dashboard',
        href: parentDashboardHref,
        onClick: onActionClick,
        testId: 'kangur-primary-nav-parent-dashboard',
        transition: {
          active: isTransitionSourceActive({ activeTransitionSourceId, transitionPhase, transitionSourceId: parentDashboardTransitionSourceId }),
          sourceId: parentDashboardTransitionSourceId,
        },
      })}

      {renderNavAction({
        className: yellowPillActionClassName,
        content: isSixYearOld ? (
          <KangurVisualCueContent detail={subjectVisual.detail} detailClassName='text-sm font-bold' detailTestId='kangur-primary-nav-subject-detail' icon={subjectVisual.icon} iconClassName='text-lg' iconTestId='kangur-primary-nav-subject-icon' label={subjectChoiceLabel} />
        ) : (
          <>
            <BookCheck aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span className='truncate'>{subjectChoiceLabel}</span>
          </>
        ),
        docId: 'top_nav_subject_choice',
        onClick: () => {
          setIsSubjectModalOpen(true);
          onActionClick?.();
        },
        testId: 'kangur-primary-nav-subject',
      })}

      {renderNavAction({
        className: amberPillActionClassName,
        content: isSixYearOld ? (
          <KangurVisualCueContent detail={ageGroupVisual.detail} detailClassName='text-sm font-bold' detailTestId='kangur-primary-nav-age-group-detail' icon={ageGroupVisual.icon} iconClassName='text-lg' iconTestId='kangur-primary-nav-age-group-icon' label={ageGroupChoiceLabel} />
        ) : (
          <>
            <Users aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span className='truncate'>{ageGroupChoiceLabel}</span>
          </>
        ),
        docId: 'top_nav_age_group_choice',
        onClick: () => {
          setIsAgeGroupModalOpen(true);
          onActionClick?.();
        },
        testId: 'kangur-primary-nav-age-group',
      })}

      {renderNavAction({
        className: isTutorHidden ? yellowPillActionClassName : mobileNavItemClassName,
        content: (
          <>
            <BrainCircuit aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span className='truncate'>{isTutorHidden ? enableTutorLabel : disableTutorLabel}</span>
          </>
        ),
        docId: isTutorHidden ? 'kangur-ai-tutor-enable' : 'kangur-ai-tutor-disable',
        onClick: () => {
          const next = !isTutorHidden;
          persistTutorVisibilityHidden(next);
          if (!next && tutor?.enabled) tutor.openChat();
          onActionClick?.();
        },
        testId: 'kangur-ai-tutor-toggle',
      })}
    </>
  );

  const renderUtilityNavActions = (onActionClick?: () => void) => (
    <>
      <div className='flex items-center gap-2 max-sm:col-span-2 max-sm:justify-center'>
        <KangurLanguageSwitcher
          forceFallbackPath={forceLanguageSwitcherFallbackPath}
          variant='surface'
          size='sm'
          className={isCoarsePointer ? 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0' : undefined}
        />
        {kangurAppearance.isAppearanceAvailable && (
          <CmsStorefrontAppearanceButtons
            variant='surface'
            size='sm'
            className={isCoarsePointer ? 'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0' : undefined}
          />
        )}
      </div>

      <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} items-center max-sm:col-span-2 max-sm:justify-center`}>
        {shouldRenderElevatedUserMenu && elevatedSessionUser && (
          <KangurElevatedUserMenu
            adminLabel={fallbackCopy.adminLabel}
            logoutLabel={fallbackCopy.logoutLabel}
            onLogout={() => {
              onLogout();
              onActionClick?.();
            }}
            profile={!isParentAccount || hasActiveLearner ? { href: profileHref, label: profileLabel } : null}
            triggerAriaLabel={fallbackCopy.avatarLabel}
            user={elevatedSessionUser}
          />
        )}

        {shouldRenderProfileMenu && (
          <KangurProfileMenu
            avatar={profileAvatar}
            label={profileLabel}
            profile={{ href: profileHref, isActive: accessibleCurrentPage === 'LearnerProfile' }}
            transitionSourceId={profileTransitionSourceId}
            triggerClassName={mobileNavItemClassName}
          />
        )}

        {effectiveIsAuthenticated ? (
          renderNavAction({
            content: (
              <>
                <LogOut aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
                <span className='truncate'>{isLoggingOut ? fallbackCopy.logoutPendingLabel : fallbackCopy.logoutLabel}</span>
              </>
            ),
            disabled: isLoggingOut,
            docId: 'profile_logout',
            className: mobileNavItemClassName,
            onClick: () => {
              onLogout();
              onActionClick?.();
            },
            testId: 'kangur-primary-nav-logout',
          })
        ) : (
          onLogin && (
            <KangurPrimaryNavigationLoginAction
              className={mobileNavItemClassName}
              fallbackLabel={fallbackCopy.loginLabel}
              loginActionRef={loginActionRef}
              onLogin={onLogin}
              onActionClick={onActionClick}
            />
          )
        )}
      </div>
    </>
  );

  const topBarLeft = (
    <div className='flex w-full items-center justify-between gap-4'>
      <div className='hidden flex-1 items-center gap-2 sm:flex'>
        <KangurTopNavGroup label={navigationLabel}>
          <div className='flex items-center gap-2'>{renderPrimaryNavActions()}</div>
        </KangurTopNavGroup>
        <div className='ml-auto flex items-center gap-2'>{renderUtilityNavActions()}</div>
      </div>

      <div className='flex w-full items-center justify-between sm:hidden'>
        <KangurTopNavGroup label={navigationLabel}>
          {renderNavAction({
            active: effectiveHomeActive,
            className: 'px-2',
            content: (
              <span className='flex flex-col items-center justify-center scale-90' data-testid='kangur-home-brand-mobile'>
                <KangurHomeLogo idPrefix='kangur-primary-nav-logo-mobile' className='-translate-y-[1px]' />
                <KangurHomeBetaBadge />
              </span>
            ),
            docId: 'top_nav_home_mobile',
            href: onHomeClick ? undefined : homeHref,
            onClick: onHomeClick,
            testId: 'kangur-primary-nav-home-mobile',
          })}
        </KangurTopNavGroup>

        <div className='flex items-center gap-2'>
          {rightAccessory}
          <KangurButton
            aria-controls='kangur-primary-nav-mobile-menu'
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
            onClick={toggleMobileMenu}
            size='sm'
            variant='surface'
            className='h-11 w-11 rounded-2xl p-0'
            data-testid='kangur-primary-nav-mobile-toggle'
          >
            {isMobileMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
          </KangurButton>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <KangurPageTopBar className={props.className} contentClassName={props.contentClassName} left={topBarLeft} />

      {isMobileMenuOpen && (
        <div
          id='kangur-primary-nav-mobile-menu'
          ref={mobileMenuRef}
          className='fixed inset-0 z-[100] flex flex-col bg-[color:var(--kangur-page-background)] sm:hidden'
          data-testid='kangur-primary-nav-mobile-overlay'
        >
          <div className='flex shrink-0 items-center justify-between border-b border-[color:var(--kangur-page-border)] px-5 py-4'>
            <div className='flex items-center gap-3'>
              <KangurHomeLogo idPrefix='kangur-mobile-menu-logo' size='sm' />
              <KangurHomeBetaBadge />
            </div>
            <KangurPanelCloseButton onClick={closeMobileMenu} data-testid='kangur-primary-nav-mobile-close' />
          </div>
          <div className='flex-1 overflow-y-auto overscroll-contain p-5'>
            <div className='grid grid-cols-2 gap-3'>
              {renderPrimaryNavActions(closeMobileMenu)}
              <div className='col-span-2 my-2 h-px bg-[color:var(--kangur-page-border)] opacity-60' />
              {renderUtilityNavActions(closeMobileMenu)}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {isSubjectModalOpen && (
          <KangurChoiceDialog
            dataTestId={subjectDialogId}
            onOpenChange={setIsSubjectModalOpen}
            open={isSubjectModalOpen}
            options={subjectOptions}
            title={isSixYearOld ? <KangurVisualCueContent icon='📚' label={navTranslations('subjectChoiceTitle')} /> : navTranslations('subjectChoiceTitle')}
          >
            <KangurDialogMeta description={navTranslations('subjectChoiceDescription')} />
          </KangurChoiceDialog>
        )}

        {isAgeGroupModalOpen && (
          <KangurChoiceDialog
            dataTestId={ageGroupDialogId}
            onOpenChange={setIsAgeGroupModalOpen}
            open={isAgeGroupModalOpen}
            options={ageGroupOptions}
            title={isSixYearOld ? <KangurVisualCueContent icon='🎂' label={navTranslations('ageGroupChoiceTitle')} /> : navTranslations('ageGroupChoiceTitle')}
          >
            <KangurDialogMeta description={navTranslations('ageGroupChoiceDescription')} />
          </KangurChoiceDialog>
        )}
      </Suspense>
    </>
  );
}

export default KangurPrimaryNavigation;
