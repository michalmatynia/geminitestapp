'use client';

import {
  Menu,
  X,
} from 'lucide-react';
import React from 'react';

import {
  useOptionalCmsStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
  isKangurEmbeddedBasePath,
} from '@/features/kangur/config/routing';
import { persistTutorVisibilityHidden } from '@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget.storage';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  DEFAULT_KANGUR_AGE_GROUP,
  KANGUR_AGE_GROUPS,
  getKangurDefaultSubjectForAgeGroup,
  getKangurSubjectsForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog-metadata';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';

import {
  useKangurPrimaryNavigationState,
} from './KangurPrimaryNavigation.hooks';
import {
  useKangurPrimaryNavigationRuntime,
  buildAgeGroupAction,
  buildDuelsAction,
  buildGamesLibraryAction,
  buildHomeAction,
  buildLessonsAction,
  buildParentDashboardAction,
  buildSubjectAction,
  buildTutorToggleAction,
} from './KangurPrimaryNavigation.runtime';
import {
  resolveAppearanceControls,
  resolveMobileMenuHeaderActions,
} from './KangurPrimaryNavigation.utility-runtime';
import {
  buildAgeGroupOptions,
  buildSubjectOptions,
  KangurPrimaryNavigationAuthActions,
  KangurPrimaryNavigationPrimaryActions,
  KangurPrimaryNavigationUtilityActions,
} from './KangurPrimaryNavigation.sections';
import {
  buildKangurPrimaryNavigationAgeGroupDialog,
  buildKangurPrimaryNavigationSubjectDialog,
  KangurPrimaryNavigationChoiceDialogs,
  KangurPrimaryNavigationMobileMenuOverlay,
} from './KangurPrimaryNavigation.overlays';
import type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
export type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
import {
  ICON_CLASSNAME,
} from './KangurPrimaryNavigation.utils';

const resolveTutorFallbackCopy = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value;
};

const resolvePrimaryNavigationProfileDisplayName = ({
  activeLearner,
  authUser,
}: {
  activeLearner: ReturnType<typeof useKangurPrimaryNavigationState>['activeLearner'];
  authUser: ReturnType<typeof useKangurPrimaryNavigationState>['authUser'];
}): string | null => {
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
};

const resolvePrimaryNavigationLabel = ({
  fallbackCopy,
  profileDisplayName,
}: {
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  profileDisplayName: string | null;
}): string =>
  profileDisplayName
    ? fallbackCopy.profileLabelWithName(profileDisplayName)
    : fallbackCopy.profileLabel;

const resolveKangurPrimaryNavigationEffectiveHomeActive = ({
  currentPage,
  homeActive,
}: {
  currentPage: KangurPrimaryNavigationProps['currentPage'];
  homeActive?: boolean;
}): boolean => homeActive ?? currentPage === 'Game';

type KangurPrimaryNavigationTransitionPhase =
  Parameters<typeof buildHomeAction>[0]['transitionPhase'];

const resolveKangurPrimaryNavigationTransitionPhase = (
  routeTransitionState: ReturnType<typeof useKangurPrimaryNavigationState>['routeTransitionState']
): KangurPrimaryNavigationTransitionPhase => routeTransitionState?.transitionPhase ?? 'idle';

const resolveKangurPrimaryNavigationActiveTransitionSourceId = (
  routeTransitionState: ReturnType<typeof useKangurPrimaryNavigationState>['routeTransitionState']
): string | null => routeTransitionState?.activeTransitionSourceId ?? null;

const resolveKangurPrimaryNavigationCanAccessGamesLibrary = ({
  effectiveIsAuthenticated,
  isSuperAdmin,
}: {
  effectiveIsAuthenticated: boolean;
  isSuperAdmin: boolean;
}): boolean => effectiveIsAuthenticated && isSuperAdmin;

const resolveKangurPrimaryNavigationShouldRenderLanguageSwitcher = (
  basePath: string
): boolean =>
  !isKangurEmbeddedBasePath(basePath) &&
  DEFAULT_SITE_I18N_CONFIG.locales.filter((entry) => entry.enabled).length > 1;

const resolveKangurPrimaryNavigationMobileMenuLabel = ({
  isMobileMenuOpen,
  navTranslations,
}: {
  isMobileMenuOpen: boolean;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
}): string =>
  isMobileMenuOpen
    ? navTranslations('mobileMenu.close')
    : navTranslations('mobileMenu.open');

const KANGUR_PRIMARY_NAV_DIALOG_IDS = {
  ageGroup: 'kangur-primary-nav-age-group-dialog',
  mobileMenu: 'kangur-mobile-menu',
  subject: 'kangur-primary-nav-subject-dialog',
} as const;

const KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS = {
  duels: 'kangur-primary-nav:duels',
  gamesLibrary: 'kangur-primary-nav:games-library',
  home: 'kangur-primary-nav:home',
  lessons: 'kangur-primary-nav:lessons',
  parentDashboard: 'kangur-primary-nav:parent-dashboard',
  profile: 'kangur-primary-nav:profile',
} as const;

const resolveKangurPrimaryNavigationClassNames = ({
  isCoarsePointer,
}: {
  isCoarsePointer: boolean;
}) => {
  const mobileNavItemClassName = `max-sm:col-span-1 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
  const mobileWideNavItemClassName = `max-sm:col-span-2 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;

  return {
    amberPillActionClassName: `border-amber-300/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.96)_0%,rgba(253,230,138,0.92)_100%)] px-4 text-amber-800 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.58)] ring-1 ring-amber-200/90 hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(253,230,138,0.94)_100%)] hover:text-amber-900 ${mobileWideNavItemClassName}`,
    mobileNavItemClassName,
    yellowPillActionClassName: `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`,
  };
};

const resolveKangurPrimaryNavigationChoiceModel = ({
  activeLearner,
  ageGroup,
  authUser,
  fallbackCopy,
  normalizedLocale,
  setAgeGroup,
  setSubject,
  subject,
}: {
  activeLearner: ReturnType<typeof useKangurPrimaryNavigationState>['activeLearner'];
  ageGroup: ReturnType<typeof useKangurPrimaryNavigationState>['ageGroup'];
  authUser: ReturnType<typeof useKangurPrimaryNavigationState>['authUser'];
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  normalizedLocale: string;
  setAgeGroup: ReturnType<typeof useKangurPrimaryNavigationState>['setAgeGroup'];
  setSubject: ReturnType<typeof useKangurPrimaryNavigationState>['setSubject'];
  subject: ReturnType<typeof useKangurPrimaryNavigationState>['subject'];
}) => {
  const isSixYearOld = ageGroup === 'six_year_old';
  const subjectChoiceLabel = getLocalizedKangurSubjectLabel(subject, normalizedLocale);
  const ageGroupChoiceLabel = getLocalizedKangurAgeGroupLabel(ageGroup, normalizedLocale);
  const defaultSubjectLabel = getLocalizedKangurSubjectLabel(
    getKangurDefaultSubjectForAgeGroup(ageGroup),
    normalizedLocale
  );
  const defaultAgeGroupLabel = getLocalizedKangurAgeGroupLabel(
    KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP,
    normalizedLocale
  );
  const subjectVisual = getKangurSixYearOldSubjectVisual(subject);
  const ageGroupVisual = getKangurSixYearOldAgeGroupVisual(ageGroup);
  const availableSubjects = getKangurSubjectsForAgeGroup(ageGroup);

  return {
    ageGroupChoiceLabel,
    ageGroupOptions: buildAgeGroupOptions({
      ageGroup,
      isSixYearOld,
      normalizedLocale,
      setAgeGroup,
    }),
    ageGroupVisual,
    defaultAgeGroupLabel,
    defaultSubjectLabel,
    isSixYearOld,
    profileLabel: resolvePrimaryNavigationLabel({
      fallbackCopy,
      profileDisplayName: resolvePrimaryNavigationProfileDisplayName({
        activeLearner,
        authUser,
      }),
    }),
    subjectChoiceLabel,
    subjectOptions: buildSubjectOptions({
      availableSubjects,
      isSixYearOld,
      normalizedLocale,
      setSubject,
      subject,
    }),
    subjectVisual,
  };
};

const resolveKangurPrimaryNavigationTutorLabels = ({
  fallbackCopy,
  tutorContent,
}: {
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  tutorContent: ReturnType<typeof useKangurPrimaryNavigationState>['tutorContent'];
}) => ({
  disableTutorLabel: resolveTutorFallbackCopy(
    tutorContent.common.disableTutorAria,
    fallbackCopy.disableTutorLabel
  ),
  enableTutorLabel: resolveTutorFallbackCopy(
    tutorContent.common.enableTutorLabel ?? tutorContent.navigation.restoreTutorLabel,
    fallbackCopy.enableTutorLabel
  ),
});

const buildKangurPrimaryNavigationTutorToggleHandler = ({
  isTutorHidden,
  tutor,
}: {
  isTutorHidden: boolean;
  tutor: ReturnType<typeof useKangurPrimaryNavigationState>['tutor'];
}) => (): void => {
  const nextHidden = !isTutorHidden;
  persistTutorVisibilityHidden(nextHidden);
  if (!nextHidden && tutor?.enabled) {
    tutor.openChat();
  }
};

function KangurPrimaryNavigationTopBarContent({
  isCoarsePointer,
  isMobileMenuOpen,
  isMobileViewport,
  mobileMenuId,
  mobileMenuLabel,
  navigationLabel,
  onToggleMobileMenu,
  primaryActions,
  utilityActions,
}: {
  isCoarsePointer: boolean;
  isMobileMenuOpen: boolean;
  isMobileViewport: boolean;
  mobileMenuId: string;
  mobileMenuLabel: string;
  navigationLabel: string;
  onToggleMobileMenu: () => void;
  primaryActions: React.ReactNode;
  utilityActions: React.ReactNode;
}): React.JSX.Element {
  return (
    <>
      <div aria-hidden={isMobileViewport} className='hidden w-full min-w-0 sm:block'>
        <KangurTopNavGroup label={navigationLabel}>
          {primaryActions}
          {utilityActions}
        </KangurTopNavGroup>
      </div>
      <div aria-hidden={!isMobileViewport} className='w-full min-w-0 sm:hidden'>
        <KangurTopNavGroup label={navigationLabel}>
          <KangurButton
            aria-controls={mobileMenuId}
            aria-expanded={isMobileMenuOpen}
            aria-haspopup='dialog'
            aria-label={mobileMenuLabel}
            className={isCoarsePointer ? 'min-h-12 px-4 py-3' : 'px-4 py-3'}
            data-testid='kangur-primary-nav-mobile-toggle'
            fullWidth
            onClick={onToggleMobileMenu}
            size='md'
            type='button'
            variant='navigation'
          >
            {isMobileMenuOpen ? (
              <X aria-hidden='true' className={ICON_CLASSNAME} />
            ) : (
              <Menu aria-hidden='true' className={ICON_CLASSNAME} />
            )}
            <span className='sr-only'>{mobileMenuLabel}</span>
          </KangurButton>
        </KangurTopNavGroup>
      </div>
    </>
  );
}

export function KangurPrimaryNavigation({
  basePath,
  canManageLearners = false,
  className,
  contentClassName,
  currentPage,
  forceLanguageSwitcherFallbackPath = false,
  guestPlayerName,
  guestPlayerNamePlaceholder,
  homeActive,
  isAuthenticated,
  navLabel,
  onGuestPlayerNameChange,
  onHomeClick,
  onLogin,
  onLogout,
  rightAccessory,
  showParentDashboard = canManageLearners,
}: KangurPrimaryNavigationProps): React.JSX.Element {
  const {
    activeLearner,
    ageGroup,
    authUser,
    closeMobileMenu,
    effectiveIsAuthenticated,
    effectiveShowParentDashboard,
    elevatedSessionUser,
    fallbackCopy,
    isAgeGroupModalOpen,
    isCoarsePointer,
    isLoggingOut,
    isMobileMenuOpen,
    isMobileViewport,
    isSubjectModalOpen,
    isSuperAdmin,
    isTutorHidden,
    kangurAppearance,
    navTranslations,
    navigationLabel,
    normalizedLocale,
    profileAvatar,
    queryClient,
    routeTransitionState,
    setAgeGroup,
    setIsAgeGroupModalOpen,
    setIsMobileMenuOpen,
    setIsSubjectModalOpen,
    setSubject,
    shouldRenderElevatedUserMenu,
    shouldRenderProfileMenu,
    subject,
    toggleMobileMenu,
    tutor,
    tutorContent,
  } = useKangurPrimaryNavigationState({
    canManageLearners,
    currentPage,
    isAuthenticated,
    navLabel,
    showParentDashboard,
  });
  const storefrontAppearance = useOptionalCmsStorefrontAppearance();
  const accessibleCurrentPage = currentPage;
  const effectiveHomeActive = resolveKangurPrimaryNavigationEffectiveHomeActive({
    currentPage: accessibleCurrentPage,
    homeActive,
  });
  const learnerProfileIsActive = accessibleCurrentPage === 'LearnerProfile';
  const transitionPhase =
    resolveKangurPrimaryNavigationTransitionPhase(routeTransitionState);
  const activeTransitionSourceId =
    resolveKangurPrimaryNavigationActiveTransitionSourceId(routeTransitionState);
  const canAccessGamesLibrary = resolveKangurPrimaryNavigationCanAccessGamesLibrary({
    effectiveIsAuthenticated,
    isSuperAdmin,
  });
  const {
    ageGroupChoiceLabel,
    ageGroupOptions,
    ageGroupVisual,
    defaultAgeGroupLabel,
    defaultSubjectLabel,
    isSixYearOld,
    profileLabel,
    subjectChoiceLabel,
    subjectOptions,
    subjectVisual,
  } = resolveKangurPrimaryNavigationChoiceModel({
    activeLearner,
    ageGroup,
    authUser,
    fallbackCopy,
    normalizedLocale,
    setAgeGroup,
    setSubject,
    subject,
  });
  const { amberPillActionClassName, mobileNavItemClassName, yellowPillActionClassName } =
    resolveKangurPrimaryNavigationClassNames({ isCoarsePointer });
  const { disableTutorLabel, enableTutorLabel } =
    resolveKangurPrimaryNavigationTutorLabels({
      fallbackCopy,
      tutorContent,
    });
  const {
    commitGuestPlayerName,
    guestPlayerNameValue,
    guestPlayerPlaceholderText,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    isEditingGuestPlayerName,
    loginActionRef,
    mobileMenuRef,
    prefetchLessonsCatalogOnIntent,
    setIsEditingGuestPlayerName,
    showGuestPlayerNameInput,
  } = useKangurPrimaryNavigationRuntime({
    ageGroup,
    currentPage: accessibleCurrentPage,
    effectiveIsAuthenticated,
    fallbackCopy,
    guestPlayerName,
    guestPlayerNamePlaceholder,
    isMobileMenuOpen,
    normalizedLocale,
    onGuestPlayerNameChange,
    onLogin,
    queryClient,
    setIsMobileMenuOpen,
    subject,
  });
  const homeHref = getKangurHomeHref(basePath);
  const gamesLibraryHref = createPageUrl('GamesLibrary', basePath);
  const lessonsHref = createPageUrl('Lessons', basePath);
  const duelsHref = createPageUrl('Duels', basePath);
  const parentDashboardHref = createPageUrl('ParentDashboard', basePath);
  const profileHref = createPageUrl('LearnerProfile', basePath);
  const homeAction = buildHomeAction({
    activeTransitionSourceId,
    effectiveHomeActive,
    homeHref,
    homeTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.home,
    navTranslations,
    onHomeClick,
    transitionPhase,
  });
  const lessonsAction = buildLessonsAction({
    accessibleCurrentPage,
    activeTransitionSourceId,
    isSixYearOld,
    lessonsHref,
    lessonsTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.lessons,
    mobileNavItemClassName,
    navTranslations,
    prefetchLessonsCatalogOnIntent,
    transitionPhase,
  });
  const gamesLibraryAction = buildGamesLibraryAction({
    accessibleCurrentPage,
    activeTransitionSourceId,
    gamesLibraryHref,
    gamesLibraryTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.gamesLibrary,
    isSixYearOld,
    mobileNavItemClassName,
    navTranslations,
    transitionPhase,
  });
  const subjectAction = buildSubjectAction({
    className: yellowPillActionClassName,
    isSixYearOld,
    isSubjectModalOpen,
    navTranslations,
    onOpen: () => setIsSubjectModalOpen(true),
    subjectChoiceLabel,
    subjectDialogId: KANGUR_PRIMARY_NAV_DIALOG_IDS.subject,
    subjectVisual,
  });
  const ageGroupAction = buildAgeGroupAction({
    ageGroupChoiceLabel,
    ageGroupDialogId: KANGUR_PRIMARY_NAV_DIALOG_IDS.ageGroup,
    ageGroupVisual,
    className: amberPillActionClassName,
    isAgeGroupModalOpen,
    isSixYearOld,
    navTranslations,
    onOpen: () => setIsAgeGroupModalOpen(true),
  });
  const duelsAction = buildDuelsAction({
    accessibleCurrentPage,
    activeTransitionSourceId,
    duelsHref,
    duelsTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.duels,
    isSixYearOld,
    mobileNavItemClassName,
    navTranslations,
    transitionPhase,
  });
  const parentDashboardAction = buildParentDashboardAction({
    accessibleCurrentPage,
    activeTransitionSourceId,
    effectiveShowParentDashboard,
    isSixYearOld,
    mobileNavItemClassName,
    navTranslations,
    parentDashboardHref,
    parentDashboardTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.parentDashboard,
    transitionPhase,
  });
  const tutorToggleAction = buildTutorToggleAction({
    disableTutorLabel,
    enableTutorLabel,
    isTutorHidden,
    mobileNavItemClassName,
    onToggle: buildKangurPrimaryNavigationTutorToggleHandler({
      isTutorHidden,
      tutor,
    }),
    yellowPillActionClassName,
  });
  const shouldRenderLanguageSwitcher =
    resolveKangurPrimaryNavigationShouldRenderLanguageSwitcher(basePath);
  const appearanceControls = resolveAppearanceControls({
    kangurAppearanceLabels: {
      default: 'Daily',
      dawn: 'Dawn',
      sunset: 'Sunset',
      dark: 'Nightly',
    },
    kangurAppearanceModes: ['default', 'dawn', 'sunset', 'dark'],
    kangurAppearanceTone: kangurAppearance.tone,
    storefrontAppearance,
  });
  const appearanceControlsInline = resolveAppearanceControls({
    inline: true,
    kangurAppearanceLabels: {
      default: 'Daily',
      dawn: 'Dawn',
      sunset: 'Sunset',
      dark: 'Nightly',
    },
    kangurAppearanceModes: ['default', 'dawn', 'sunset', 'dark'],
    kangurAppearanceTone: kangurAppearance.tone,
    storefrontAppearance,
  });
  const authActions = (
    <KangurPrimaryNavigationAuthActions
      commitGuestPlayerName={commitGuestPlayerName}
      effectiveIsAuthenticated={effectiveIsAuthenticated}
      fallbackCopy={fallbackCopy}
      guestPlayerName={guestPlayerName}
      guestPlayerNameValue={guestPlayerNameValue}
      guestPlayerPlaceholderText={guestPlayerPlaceholderText}
      handleGuestPlayerNameChange={handleGuestPlayerNameChange}
      hasGuestPlayerName={hasGuestPlayerName}
      isEditingGuestPlayerName={isEditingGuestPlayerName}
      isLoggingOut={isLoggingOut}
      loginActionRef={loginActionRef}
      mobileNavItemClassName={mobileNavItemClassName}
      onLogin={onLogin}
      onLogout={onLogout}
      setIsEditingGuestPlayerName={setIsEditingGuestPlayerName}
      showGuestPlayerNameInput={showGuestPlayerNameInput}
    />
  );
  const homeActionWithMobileClassName = {
    ...homeAction,
    className: `${homeAction.className} ${mobileNavItemClassName}`,
  };
  const primaryActions = (
    <KangurPrimaryNavigationPrimaryActions
      ageGroupAction={ageGroupAction}
      appearanceControlsInline={appearanceControlsInline}
      canAccessGamesLibrary={canAccessGamesLibrary}
      duelsAction={duelsAction}
      gamesLibraryAction={gamesLibraryAction}
      homeAction={homeActionWithMobileClassName}
      isTutorHidden={isTutorHidden}
      lessonsAction={lessonsAction}
      subjectAction={subjectAction}
      tutorToggleAction={tutorToggleAction}
    />
  );
  const utilityActions = (
    <KangurPrimaryNavigationUtilityActions
      accessibleCurrentPage={accessibleCurrentPage}
      appearanceControls={appearanceControls}
      authActions={authActions}
      basePath={basePath}
      elevatedSessionUser={elevatedSessionUser}
      fallbackCopy={fallbackCopy}
      forceLanguageSwitcherFallbackPath={forceLanguageSwitcherFallbackPath}
      isCoarsePointer={isCoarsePointer}
      learnerProfileIsActive={learnerProfileIsActive}
      mobileNavItemClassName={mobileNavItemClassName}
      onLogout={onLogout}
      parentDashboardAction={parentDashboardAction}
      profileAvatar={profileAvatar}
      profileHref={profileHref}
      profileLabel={profileLabel}
      profileTransitionSourceId={KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.profile}
      rightAccessory={rightAccessory}
      shouldRenderElevatedUserMenu={shouldRenderElevatedUserMenu}
      shouldRenderLanguageSwitcher={shouldRenderLanguageSwitcher}
      shouldRenderProfileMenu={shouldRenderProfileMenu}
    />
  );
  const mobileMenuLabel = resolveKangurPrimaryNavigationMobileMenuLabel({
    isMobileMenuOpen,
    navTranslations,
  });
  const mobileMenuHeaderActions = resolveMobileMenuHeaderActions({
    appearanceControlsInline,
    basePath,
    currentPage: accessibleCurrentPage,
    forceLanguageSwitcherFallbackPath,
    shouldRenderLanguageSwitcher,
  });
  const mobileAuthActions = (
    <KangurPrimaryNavigationAuthActions
      commitGuestPlayerName={commitGuestPlayerName}
      effectiveIsAuthenticated={effectiveIsAuthenticated}
      fallbackCopy={fallbackCopy}
      guestPlayerName={guestPlayerName}
      guestPlayerNameValue={guestPlayerNameValue}
      guestPlayerPlaceholderText={guestPlayerPlaceholderText}
      handleGuestPlayerNameChange={handleGuestPlayerNameChange}
      hasGuestPlayerName={hasGuestPlayerName}
      isEditingGuestPlayerName={isEditingGuestPlayerName}
      isLoggingOut={isLoggingOut}
      loginActionRef={loginActionRef}
      mobileNavItemClassName={mobileNavItemClassName}
      onActionClick={closeMobileMenu}
      onLogin={onLogin}
      onLogout={onLogout}
      setIsEditingGuestPlayerName={setIsEditingGuestPlayerName}
      showGuestPlayerNameInput={showGuestPlayerNameInput}
    />
  );
  const mobilePrimaryActions = (
    <KangurPrimaryNavigationPrimaryActions
      ageGroupAction={ageGroupAction}
      appearanceControlsInline={appearanceControlsInline}
      canAccessGamesLibrary={canAccessGamesLibrary}
      duelsAction={duelsAction}
      gamesLibraryAction={gamesLibraryAction}
      homeAction={homeActionWithMobileClassName}
      inlineAppearanceWithTutor={false}
      isTutorHidden={isTutorHidden}
      lessonsAction={lessonsAction}
      onActionClick={closeMobileMenu}
      subjectAction={subjectAction}
      tutorToggleAction={tutorToggleAction}
      wrapperClassName='flex w-full flex-col gap-2'
    />
  );
  const mobileUtilityActions = (
    <KangurPrimaryNavigationUtilityActions
      accessibleCurrentPage={accessibleCurrentPage}
      appearanceControls={appearanceControls}
      authActions={mobileAuthActions}
      basePath={basePath}
      elevatedSessionUser={elevatedSessionUser}
      fallbackCopy={fallbackCopy}
      forceLanguageSwitcherFallbackPath={forceLanguageSwitcherFallbackPath}
      hideAppearanceControls={Boolean(appearanceControlsInline)}
      hideLanguageSwitcher={shouldRenderLanguageSwitcher}
      isCoarsePointer={isCoarsePointer}
      learnerProfileIsActive={learnerProfileIsActive}
      mobileNavItemClassName={mobileNavItemClassName}
      onActionClick={closeMobileMenu}
      onLogout={onLogout}
      parentDashboardAction={parentDashboardAction}
      profileAvatar={profileAvatar}
      profileHref={profileHref}
      profileLabel={profileLabel}
      profileTransitionSourceId={KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.profile}
      rightAccessory={rightAccessory}
      shouldRenderElevatedUserMenu={shouldRenderElevatedUserMenu}
      shouldRenderLanguageSwitcher={shouldRenderLanguageSwitcher}
      shouldRenderProfileMenu={shouldRenderProfileMenu}
      testId='kangur-primary-nav-mobile-utility-actions'
      wrapperClassName='flex w-full flex-col gap-2'
    />
  );

  return (
    <>
      <KangurPageTopBar
        className={className}
        contentClassName={contentClassName}
        left={
          <KangurPrimaryNavigationTopBarContent
            isCoarsePointer={isCoarsePointer}
            isMobileMenuOpen={isMobileMenuOpen}
            isMobileViewport={isMobileViewport}
            mobileMenuId={KANGUR_PRIMARY_NAV_DIALOG_IDS.mobileMenu}
            mobileMenuLabel={mobileMenuLabel}
            navigationLabel={navigationLabel}
            onToggleMobileMenu={toggleMobileMenu}
            primaryActions={primaryActions}
            utilityActions={utilityActions}
          />
        }
      />
      <KangurPrimaryNavigationMobileMenuOverlay
        closeMobileMenu={closeMobileMenu}
        closeMobileMenuLabel={navTranslations('mobileMenu.close')}
        headerActions={mobileMenuHeaderActions}
        isMobileMenuOpen={isMobileMenuOpen}
        isMobileViewport={isMobileViewport}
        menuDescription={navTranslations('mobileMenu.description')}
        menuId={KANGUR_PRIMARY_NAV_DIALOG_IDS.mobileMenu}
        menuRef={mobileMenuRef}
        menuTitle={navTranslations('mobileMenu.title')}
        navigationLabel={navigationLabel}
        primaryActions={mobilePrimaryActions}
        textColor={kangurAppearance.tone.text}
        toneBackground={kangurAppearance.tone.background}
        utilityActions={mobileUtilityActions}
      />
      <KangurPrimaryNavigationChoiceDialogs
        ageGroupDialog={buildKangurPrimaryNavigationAgeGroupDialog({
          ageGroupChoiceLabel,
          ageGroupVisual,
          defaultAgeGroupLabel,
          isSixYearOld,
          navTranslations,
          onOpenChange: setIsAgeGroupModalOpen,
          open: isAgeGroupModalOpen,
          options: ageGroupOptions,
        })}
        subjectDialog={buildKangurPrimaryNavigationSubjectDialog({
          ageGroup: ageGroup,
          defaultSubjectLabel,
          isSixYearOld,
          navTranslations,
          onOpenChange: setIsSubjectModalOpen,
          open: isSubjectModalOpen,
          options: subjectOptions,
          subjectChoiceLabel,
          subjectVisual,
        })}
      />
    </>
  );
}

export default KangurPrimaryNavigation;
