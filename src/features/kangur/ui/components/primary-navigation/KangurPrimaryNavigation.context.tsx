'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useKangurPrimaryNavigationState } from './KangurPrimaryNavigation.hooks';
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
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
  isKangurEmbeddedBasePath,
} from '@/features/kangur/config/routing';
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
import { persistTutorVisibilityHidden } from '@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget.storage';
import {
  buildAgeGroupOptions,
  buildSubjectOptions,
} from './KangurPrimaryNavigation.sections';
import {
  resolveAppearanceControls,
} from './KangurPrimaryNavigation.utility-runtime';
import { useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import type { 
  KangurNavActionConfig,
  KangurPrimaryNavigationProps 
} from './KangurPrimaryNavigation.types';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

import type { KangurChoiceDialogOption } from '@/features/kangur/ui/components/KangurChoiceDialog';
import type { KangurLessonAgeGroup, KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';

type PrimaryNavigationState = ReturnType<typeof useKangurPrimaryNavigationState>;
type PrimaryNavigationRuntime = ReturnType<typeof useKangurPrimaryNavigationRuntime>;

type KangurPrimaryNavigationVisual = { detail: string; icon: React.ReactNode };

export type KangurPrimaryNavigationContextValue = {
  activeLearner: PrimaryNavigationState['activeLearner'];
  ageGroup: KangurLessonAgeGroup;
  authUser: PrimaryNavigationState['authUser'];
  closeMobileMenu: () => void;
  effectiveIsAuthenticated: boolean;
  effectiveShowParentDashboard: boolean;
  elevatedSessionUser: PrimaryNavigationState['elevatedSessionUser'];
  fallbackCopy: PrimaryNavigationState['fallbackCopy'];
  isAgeGroupModalOpen: boolean;
  isCoarsePointer: boolean;
  isLoggingOut: boolean;
  isMobileMenuOpen: boolean;
  isMobileViewport: boolean;
  isSubjectModalOpen: boolean;
  isSuperAdmin: boolean;
  isTutorHidden: boolean;
  kangurAppearance: PrimaryNavigationState['kangurAppearance'];
  navTranslations: KangurIntlTranslate;
  navigationLabel: string;
  normalizedLocale: string;
  profileAvatar: PrimaryNavigationState['profileAvatar'];
  queryClient: PrimaryNavigationState['queryClient'];
  routeTransitionState: PrimaryNavigationState['routeTransitionState'];
  setAgeGroup: (val: KangurLessonAgeGroup) => void;
  setIsAgeGroupModalOpen: (val: boolean) => void;
  setIsMobileMenuOpen: (val: boolean) => void;
  setIsSubjectModalOpen: (val: boolean) => void;
  setSubject: (val: KangurLessonSubject) => void;
  shouldRenderElevatedUserMenu: boolean;
  shouldRenderProfileMenu: boolean;
  subject: KangurLessonSubject;
  toggleMobileMenu: () => void;
  tutor: PrimaryNavigationState['tutor'];
  tutorContent: PrimaryNavigationState['tutorContent'];
  loginActionRef: PrimaryNavigationRuntime['loginActionRef'];
  mobileMenuRef: PrimaryNavigationRuntime['mobileMenuRef'];
  props: KangurPrimaryNavigationProps;
  derived: {
    isSixYearOld: boolean;
    homeAction: KangurNavActionConfig;
    lessonsAction: KangurNavActionConfig;
    gamesLibraryAction: KangurNavActionConfig;
    subjectAction: KangurNavActionConfig;
    ageGroupAction: KangurNavActionConfig;
    duelsAction: KangurNavActionConfig;
    parentDashboardAction: KangurNavActionConfig | null;
    tutorToggleAction: KangurNavActionConfig;
    canAccessGamesLibrary: boolean;
    shouldRenderLanguageSwitcher: boolean;
    appearanceControls: React.ReactNode;
    appearanceControlsInline: React.ReactNode;
    profileHref: string;
    profileLabel: string;
    profileTransitionSourceId: string;
    mobileNavItemClassName: string;
    amberPillActionClassName: string;
    yellowPillActionClassName: string;
    subjectOptions: KangurChoiceDialogOption[];
    ageGroupOptions: KangurChoiceDialogOption[];
    ageGroupChoiceLabel: string;
    subjectChoiceLabel: string;
    defaultAgeGroupLabel: string;
    defaultSubjectLabel: string;
    subjectVisual: KangurPrimaryNavigationVisual;
    ageGroupVisual: KangurPrimaryNavigationVisual;
    inlineAppearanceWithTutor: boolean;
    basePath: string;
  };
};

const KangurPrimaryNavigationContext = createContext<KangurPrimaryNavigationContextValue | null>(null);

export const KANGUR_PRIMARY_NAV_DIALOG_IDS = {
  ageGroup: 'kangur-primary-nav-age-group-dialog',
  mobileMenu: 'kangur-mobile-menu',
  subject: 'kangur-primary-nav-subject-dialog',
} as const;

export const KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS = {
  duels: 'kangur-primary-nav:duels',
  gamesLibrary: 'kangur-primary-nav:games-library',
  home: 'kangur-primary-nav:home',
  lessons: 'kangur-primary-nav:lessons',
  parentDashboard: 'kangur-primary-nav:parent-dashboard',
  profile: 'kangur-primary-nav:profile',
} as const;

const resolvePrimaryNavigationProfileDisplayName = ({
  activeLearner,
  authUser,
}: {
  activeLearner: PrimaryNavigationState['activeLearner'];
  authUser: PrimaryNavigationState['authUser'];
}): string | null => {
  const candidates = [
    activeLearner?.displayName,
    activeLearner?.loginName,
    authUser?.full_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }

  return null;
};

const resolvePrimaryNavigationLabel = ({
  fallbackCopy,
  profileDisplayName,
}: {
  fallbackCopy: PrimaryNavigationState['fallbackCopy'];
  profileDisplayName: string | null;
}): string =>
  profileDisplayName
    ? fallbackCopy.profileLabelWithName(profileDisplayName)
    : fallbackCopy.profileLabel;

const resolveTutorFallbackCopy = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  return value;
};

export function KangurPrimaryNavigationProvider({
  children,
  ...props
}: KangurPrimaryNavigationProps & { children: React.ReactNode }) {
  const state = useKangurPrimaryNavigationState({
    canManageLearners: props.canManageLearners,
    currentPage: props.currentPage,
    isAuthenticated: props.isAuthenticated,
    navLabel: props.navLabel,
    showParentDashboard: props.showParentDashboard,
  });

  const runtime = useKangurPrimaryNavigationRuntime({
    ageGroup: state.ageGroup,
    currentPage: props.currentPage,
    effectiveIsAuthenticated: state.effectiveIsAuthenticated,
    fallbackCopy: state.fallbackCopy,
    guestPlayerName: props.guestPlayerName,
    guestPlayerNamePlaceholder: props.guestPlayerNamePlaceholder,
    isMobileMenuOpen: state.isMobileMenuOpen,
    normalizedLocale: state.normalizedLocale,
    onGuestPlayerNameChange: props.onGuestPlayerNameChange,
    onLogin: props.onLogin,
    queryClient: state.queryClient,
    setIsMobileMenuOpen: state.setIsMobileMenuOpen,
    subject: state.subject,
  });

  const storefrontAppearance = useOptionalCmsStorefrontAppearance();

  const derived = useMemo(() => {
    const isSixYearOld = state.ageGroup === 'six_year_old';
    const transitionPhase = state.routeTransitionState?.transitionPhase ?? 'idle';
    const activeTransitionSourceId = state.routeTransitionState?.activeTransitionSourceId ?? null;
    const canAccessGamesLibrary = state.effectiveIsAuthenticated && state.isSuperAdmin;
    
    const subjectChoiceLabel = getLocalizedKangurSubjectLabel(state.subject, state.normalizedLocale);
    const ageGroupChoiceLabel = getLocalizedKangurAgeGroupLabel(state.ageGroup, state.normalizedLocale);
    const subjectVisual = getKangurSixYearOldSubjectVisual(state.subject);
    const ageGroupVisual = getKangurSixYearOldAgeGroupVisual(state.ageGroup);
    const availableSubjects = getKangurSubjectsForAgeGroup(state.ageGroup);

    const subjectOptions = buildSubjectOptions({
      availableSubjects,
      isSixYearOld,
      normalizedLocale: state.normalizedLocale,
      setSubject: state.setSubject,
      subject: state.subject,
    });

    const ageGroupOptions = buildAgeGroupOptions({
      ageGroup: state.ageGroup,
      isSixYearOld,
      normalizedLocale: state.normalizedLocale,
      setAgeGroup: state.setAgeGroup,
    });

    const profileDisplayName = resolvePrimaryNavigationProfileDisplayName({
      activeLearner: state.activeLearner,
      authUser: state.authUser,
    });

    const profileLabel = resolvePrimaryNavigationLabel({
      fallbackCopy: state.fallbackCopy,
      profileDisplayName,
    });

    const mobileNavItemClassName = `max-sm:col-span-1 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${state.isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
    const mobileWideNavItemClassName = `max-sm:col-span-2 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${state.isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;

    const amberPillActionClassName = `border-amber-300/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.96)_0%,rgba(253,230,138,0.92)_100%)] px-4 text-amber-800 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.58)] ring-1 ring-amber-200/90 hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(253,230,138,0.94)_100%)] hover:text-amber-900 ${mobileWideNavItemClassName}`;
    const yellowPillActionClassName = `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`;

    const disableTutorLabel = resolveTutorFallbackCopy(
      state.tutorContent.common.disableTutorAria,
      state.fallbackCopy.disableTutorLabel
    );
    const enableTutorLabel = resolveTutorFallbackCopy(
      state.tutorContent.common.enableTutorLabel ?? state.tutorContent.navigation.restoreTutorLabel,
      state.fallbackCopy.enableTutorLabel
    );

    const homeHref = getKangurHomeHref(props.basePath);
    const homeAction = buildHomeAction({
      activeTransitionSourceId,
      effectiveHomeActive: props.homeActive ?? props.currentPage === 'Game',
      homeHref,
      homeTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.home,
      navTranslations: state.navTranslations,
      onHomeClick: props.onHomeClick,
      transitionPhase,
    });

    const lessonsAction = buildLessonsAction({
      accessibleCurrentPage: props.currentPage,
      activeTransitionSourceId,
      isSixYearOld,
      lessonsHref: createPageUrl('Lessons', props.basePath),
      lessonsTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.lessons,
      mobileNavItemClassName,
      navTranslations: state.navTranslations,
      prefetchLessonsCatalogOnIntent: runtime.prefetchLessonsCatalogOnIntent,
      transitionPhase,
    });

    const gamesLibraryAction = buildGamesLibraryAction({
      accessibleCurrentPage: props.currentPage,
      activeTransitionSourceId,
      gamesLibraryHref: createPageUrl('GamesLibrary', props.basePath),
      gamesLibraryTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.gamesLibrary,
      isSixYearOld,
      mobileNavItemClassName,
      navTranslations: state.navTranslations,
      transitionPhase,
    });

    const subjectAction = buildSubjectAction({
      className: yellowPillActionClassName,
      isSixYearOld,
      isSubjectModalOpen: state.isSubjectModalOpen,
      navTranslations: state.navTranslations,
      onOpen: () => state.setIsSubjectModalOpen(true),
      subjectChoiceLabel,
      subjectDialogId: KANGUR_PRIMARY_NAV_DIALOG_IDS.subject,
      subjectVisual,
    });

    const ageGroupAction = buildAgeGroupAction({
      ageGroupChoiceLabel,
      ageGroupDialogId: KANGUR_PRIMARY_NAV_DIALOG_IDS.ageGroup,
      ageGroupVisual,
      className: amberPillActionClassName,
      isAgeGroupModalOpen: state.isAgeGroupModalOpen,
      isSixYearOld,
      navTranslations: state.navTranslations,
      onOpen: () => state.setIsAgeGroupModalOpen(true),
    });

    const duelsAction = buildDuelsAction({
      accessibleCurrentPage: props.currentPage,
      activeTransitionSourceId,
      duelsHref: createPageUrl('Duels', props.basePath),
      duelsTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.duels,
      isSixYearOld,
      mobileNavItemClassName,
      navTranslations: state.navTranslations,
      transitionPhase,
    });

    const parentDashboardAction = buildParentDashboardAction({
      accessibleCurrentPage: props.currentPage,
      activeTransitionSourceId,
      effectiveShowParentDashboard: state.effectiveShowParentDashboard,
      isSixYearOld,
      mobileNavItemClassName,
      navTranslations: state.navTranslations,
      parentDashboardHref: createPageUrl('ParentDashboard', props.basePath),
      parentDashboardTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.parentDashboard,
      transitionPhase,
    });

    const handleTutorToggle = (): void => {
      const nextHidden = !state.isTutorHidden;
      persistTutorVisibilityHidden(nextHidden);
      if (!nextHidden && state.tutor?.enabled) {
        state.tutor.openChat();
      }
    };

    const tutorToggleAction = buildTutorToggleAction({
      disableTutorLabel,
      enableTutorLabel,
      isTutorHidden: state.isTutorHidden,
      mobileNavItemClassName,
      onToggle: handleTutorToggle,
      yellowPillActionClassName,
    });

    const shouldRenderLanguageSwitcher = !isKangurEmbeddedBasePath(props.basePath);
    
    const appearanceControls = resolveAppearanceControls({
      kangurAppearanceLabels: {
        default: 'Daily',
        dawn: 'Dawn',
        sunset: 'Sunset',
        dark: 'Nightly',
      },
      kangurAppearanceModes: ['default', 'dawn', 'sunset', 'dark'],
      kangurAppearanceTone: state.kangurAppearance.tone,
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
      kangurAppearanceTone: state.kangurAppearance.tone,
      storefrontAppearance,
    });

    return {
      isSixYearOld,
      homeAction,
      lessonsAction,
      gamesLibraryAction,
      subjectAction,
      ageGroupAction,
      duelsAction,
      parentDashboardAction,
      tutorToggleAction,
      canAccessGamesLibrary,
      shouldRenderLanguageSwitcher,
      appearanceControls,
      appearanceControlsInline,
      profileHref: createPageUrl('LearnerProfile', props.basePath),
      profileLabel,
      profileTransitionSourceId: KANGUR_PRIMARY_NAV_TRANSITION_SOURCE_IDS.profile,
      mobileNavItemClassName,
      amberPillActionClassName,
      yellowPillActionClassName,
      subjectOptions,
      ageGroupOptions,
      ageGroupChoiceLabel,
      subjectChoiceLabel,
      defaultAgeGroupLabel: getLocalizedKangurAgeGroupLabel(
        KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP,
        state.normalizedLocale
      ),
      defaultSubjectLabel: getLocalizedKangurSubjectLabel(
        getKangurDefaultSubjectForAgeGroup(state.ageGroup),
        state.normalizedLocale
      ),
      subjectVisual,
      ageGroupVisual,
      basePath: props.basePath,
      inlineAppearanceWithTutor: true,
    };
  }, [state, runtime, props, storefrontAppearance]);

  const value: KangurPrimaryNavigationContextValue = useMemo(() => ({
    ...state,
    ...runtime,
    props,
    derived,
  }), [state, runtime, props, derived]);

  return (
    <KangurPrimaryNavigationContext.Provider value={value}>
      {children}
    </KangurPrimaryNavigationContext.Provider>
  );
}

export function useKangurPrimaryNavigationContext(): KangurPrimaryNavigationContextValue {
  const context = useContext(KangurPrimaryNavigationContext);
  if (!context) {
    throw new Error('useKangurPrimaryNavigationContext must be used within a KangurPrimaryNavigationProvider');
  }
  return context;
}
