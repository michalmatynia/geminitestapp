'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookCheck,
  BrainCircuit,
  LayoutGrid,
  Trophy,
  Users,
} from 'lucide-react';

import { KangurHomeLogo } from '@/features/kangur/ui/components/wordmarks/KangurHomeLogo';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';

import { KangurHomeBetaBadge } from './KangurPrimaryNavigation.components';
import {
  useKangurPrimaryNavigationLessonsPrefetchOnIntent,
  useKangurPrimaryNavigationState,
} from './KangurPrimaryNavigation.hooks';
import type {
  KangurNavActionConfig,
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
import {
  ICON_CLASSNAME,
  isTransitionSourceActive,
  PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS,
  renderGamesLibraryNavActionContent,
  renderLessonsNavActionContent,
} from './KangurPrimaryNavigation.utils';

type KangurPrimaryNavigationTransitionPhase =
  'pending' | 'idle' | 'acknowledging' | 'waiting_for_ready' | 'revealing';

function useKangurPrimaryNavigationMobileMenuBodyLock(isMobileMenuOpen: boolean): void {
  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return (): void => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);
}

function useKangurPrimaryNavigationMobileMenuEscapeClose({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}): void {
  useEffect(() => {
    if (!isMobileMenuOpen || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);
}

function useKangurPrimaryNavigationMobileMenuFocusRestore({
  isMobileMenuOpen,
  mobileMenuPreviousFocusRef,
}: {
  isMobileMenuOpen: boolean;
  mobileMenuPreviousFocusRef: React.MutableRefObject<HTMLElement | null>;
}): void {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (isMobileMenuOpen) {
      mobileMenuPreviousFocusRef.current = document.activeElement as HTMLElement | null;
      return;
    }

    if (mobileMenuPreviousFocusRef.current) {
      mobileMenuPreviousFocusRef.current.focus();
      mobileMenuPreviousFocusRef.current = null;
    }
  }, [isMobileMenuOpen, mobileMenuPreviousFocusRef]);
}

function useKangurPrimaryNavigationMobileMenuInitialFocus(isMobileMenuOpen: boolean): void {
  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') {
      return;
    }

    const closeButton = document.getElementById('kangur-mobile-menu-close');
    if (closeButton instanceof HTMLElement) {
      closeButton.focus();
    }
  }, [isMobileMenuOpen]);
}

function useKangurPrimaryNavigationMobileMenuFocusTrap({
  isMobileMenuOpen,
  mobileMenuRef,
}: {
  isMobileMenuOpen: boolean;
  mobileMenuRef: React.RefObject<HTMLDivElement | null>;
}): void {
  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const menu = mobileMenuRef.current;
    if (!menu || typeof document === 'undefined') {
      return;
    }

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    const getFocusable = (): HTMLElement[] =>
      Array.from(menu.querySelectorAll<HTMLElement>(selector)).filter(
        (element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden')
      );
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusable();
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      const activeElement = document.activeElement;
      if (event.shiftKey) {
        if (activeElement === first || activeElement === menu) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    menu.addEventListener('keydown', handleKeyDown);
    return (): void => {
      menu.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen, mobileMenuRef]);
}

function useKangurPrimaryNavigationGuestEditingState({
  hasGuestPlayerName,
  setIsEditingGuestPlayerName,
  showGuestPlayerNameInput,
}: {
  hasGuestPlayerName: boolean;
  setIsEditingGuestPlayerName: React.Dispatch<React.SetStateAction<boolean>>;
  showGuestPlayerNameInput: boolean;
}): void {
  useEffect(() => {
    if (!showGuestPlayerNameInput) {
      setIsEditingGuestPlayerName(false);
      return;
    }

    if (!hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
    }
  }, [hasGuestPlayerName, setIsEditingGuestPlayerName, showGuestPlayerNameInput]);
}

function useKangurPrimaryNavigationLoginAnchor({
  effectiveIsAuthenticated,
  fallbackCopy,
  loginActionRef,
  onLogin,
}: {
  effectiveIsAuthenticated: boolean;
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  loginActionRef: React.RefObject<HTMLButtonElement | null>;
  onLogin?: () => void;
}): void {
  useKangurTutorAnchor({
    id: 'kangur-auth-login-action',
    kind: 'login_action',
    ref: loginActionRef,
    surface: 'auth',
    enabled: !effectiveIsAuthenticated && Boolean(onLogin),
    priority: 130,
    metadata: {
      label: fallbackCopy.loginLabel,
    },
  });
}

function useKangurPrimaryNavigationGuestPlayerNameRuntime({
  effectiveIsAuthenticated,
  fallbackCopy,
  guestPlayerName,
  guestPlayerNamePlaceholder,
  onGuestPlayerNameChange,
}: {
  effectiveIsAuthenticated: boolean;
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  guestPlayerName?: string;
  guestPlayerNamePlaceholder?: string;
  onGuestPlayerNameChange?: (value: string) => void;
}) {
  const guestPlayerNameValue = typeof guestPlayerName === 'string' ? guestPlayerName : '';
  const guestPlayerPlaceholderText =
    guestPlayerNamePlaceholder ?? fallbackCopy.guestPlayerNamePlaceholder;
  const [isEditingGuestPlayerName, setIsEditingGuestPlayerName] = useState(
    !(guestPlayerName?.trim() ?? '')
  );
  const showGuestPlayerNameInput =
    !effectiveIsAuthenticated &&
    typeof guestPlayerName === 'string' &&
    typeof onGuestPlayerNameChange === 'function';
  const hasGuestPlayerName = guestPlayerNameValue.trim().length > 0;

  const handleGuestPlayerNameChange = useCallback(
    (value: string): void => {
      onGuestPlayerNameChange?.(value);
    },
    [onGuestPlayerNameChange]
  );

  const commitGuestPlayerName = useCallback((): void => {
    if (!showGuestPlayerNameInput || !hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
      return;
    }

    const trimmedValue = guestPlayerNameValue.trim();
    if (trimmedValue !== guestPlayerNameValue) {
      handleGuestPlayerNameChange(trimmedValue);
    }

    setIsEditingGuestPlayerName(false);
  }, [
    guestPlayerNameValue,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    showGuestPlayerNameInput,
  ]);

  return {
    commitGuestPlayerName,
    guestPlayerNameValue,
    guestPlayerPlaceholderText,
    handleGuestPlayerNameChange,
    hasGuestPlayerName,
    isEditingGuestPlayerName,
    setIsEditingGuestPlayerName,
    showGuestPlayerNameInput,
  };
}

export function useKangurPrimaryNavigationRuntime({
  ageGroup,
  currentPage,
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
}: {
  ageGroup: ReturnType<typeof useKangurPrimaryNavigationState>['ageGroup'];
  currentPage: KangurPrimaryNavigationProps['currentPage'];
  effectiveIsAuthenticated: boolean;
  fallbackCopy: ReturnType<typeof useKangurPrimaryNavigationState>['fallbackCopy'];
  guestPlayerName?: string;
  guestPlayerNamePlaceholder?: string;
  isMobileMenuOpen: boolean;
  normalizedLocale: string;
  onGuestPlayerNameChange?: (value: string) => void;
  onLogin?: () => void;
  queryClient: ReturnType<typeof useKangurPrimaryNavigationState>['queryClient'];
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  subject: ReturnType<typeof useKangurPrimaryNavigationState>['subject'];
}) {
  const loginActionRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuPreviousFocusRef = useRef<HTMLElement | null>(null);
  const guestPlayerNameRuntime = useKangurPrimaryNavigationGuestPlayerNameRuntime({
    effectiveIsAuthenticated,
    fallbackCopy,
    guestPlayerName,
    guestPlayerNamePlaceholder,
    onGuestPlayerNameChange,
  });
  const prefetchLessonsCatalogOnIntent =
    useKangurPrimaryNavigationLessonsPrefetchOnIntent({
      ageGroup,
      currentPage,
      normalizedLocale,
      queryClient,
      subject,
    });

  useKangurPrimaryNavigationMobileMenuBodyLock(isMobileMenuOpen);
  useKangurPrimaryNavigationMobileMenuEscapeClose({
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  });
  useKangurPrimaryNavigationMobileMenuFocusRestore({
    isMobileMenuOpen,
    mobileMenuPreviousFocusRef,
  });
  useKangurPrimaryNavigationMobileMenuInitialFocus(isMobileMenuOpen);
  useKangurPrimaryNavigationMobileMenuFocusTrap({
    isMobileMenuOpen,
    mobileMenuRef,
  });
  useKangurPrimaryNavigationGuestEditingState({
    hasGuestPlayerName: guestPlayerNameRuntime.hasGuestPlayerName,
    setIsEditingGuestPlayerName: guestPlayerNameRuntime.setIsEditingGuestPlayerName,
    showGuestPlayerNameInput: guestPlayerNameRuntime.showGuestPlayerNameInput,
  });
  useKangurPrimaryNavigationLoginAnchor({
    effectiveIsAuthenticated,
    fallbackCopy,
    loginActionRef,
    onLogin,
  });

  return {
    ...guestPlayerNameRuntime,
    loginActionRef,
    mobileMenuRef,
    prefetchLessonsCatalogOnIntent,
  };
}

const resolveSubjectActionContent = ({
  isSixYearOld,
  label,
  subjectVisual,
}: {
  isSixYearOld: boolean;
  label: string;
  subjectVisual: ReturnType<typeof getKangurSixYearOldSubjectVisual>;
}): React.ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail={subjectVisual.detail}
      detailClassName='text-sm font-bold'
      detailTestId='kangur-primary-nav-subject-detail'
      icon={subjectVisual.icon}
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-subject-icon'
      label={label}
    />
  ) : (
    <>
      <BookCheck aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span className='truncate'>{label}</span>
    </>
  );

const resolveAgeGroupActionContent = ({
  ageGroupVisual,
  isSixYearOld,
  label,
}: {
  ageGroupVisual: ReturnType<typeof getKangurSixYearOldAgeGroupVisual>;
  isSixYearOld: boolean;
  label: string;
}): React.ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      detail={ageGroupVisual.detail}
      detailClassName='text-sm font-bold'
      detailTestId='kangur-primary-nav-age-group-detail'
      icon={ageGroupVisual.icon}
      iconClassName='text-lg'
      iconTestId='kangur-primary-nav-age-group-icon'
      label={label}
    />
  ) : (
    <>
      <Users aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span className='truncate'>{label}</span>
    </>
  );

const resolveDuelsActionContent = ({
  isSixYearOld,
  label,
}: {
  isSixYearOld: boolean;
  label: string;
}): React.ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon={<Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
      iconTestId='kangur-primary-nav-duels-icon'
      label={label}
    />
  ) : (
    <>
      <Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span className='truncate'>{label}</span>
    </>
  );

const resolveParentDashboardActionContent = ({
  isSixYearOld,
  label,
}: {
  isSixYearOld: boolean;
  label: string;
}): React.ReactNode =>
  isSixYearOld ? (
    <KangurVisualCueContent
      icon={<LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
      iconTestId='kangur-primary-nav-parent-dashboard-icon'
      label={label}
    />
  ) : (
    <>
      <LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span className='truncate'>{label}</span>
    </>
  );

const resolveTutorToggleActionContent = ({
  disableTutorLabel,
  enableTutorLabel,
  isTutorHidden,
}: {
  disableTutorLabel: string;
  enableTutorLabel: string;
  isTutorHidden: boolean;
}): React.ReactNode => (
  <>
    <BrainCircuit aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
    <span className='truncate'>{isTutorHidden ? enableTutorLabel : disableTutorLabel}</span>
  </>
);

export const buildHomeAction = ({
  activeTransitionSourceId,
  effectiveHomeActive,
  homeHref,
  homeTransitionSourceId,
  navTranslations,
  onHomeClick,
  transitionPhase,
}: {
  activeTransitionSourceId: string | null;
  effectiveHomeActive: boolean;
  homeHref: string;
  homeTransitionSourceId: string;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
  onHomeClick?: () => void;
  transitionPhase: KangurPrimaryNavigationTransitionPhase;
}): KangurNavActionConfig => ({
  active: effectiveHomeActive,
  ariaLabel: navTranslations('home'),
  className: 'px-3 sm:px-4',
  content: (
    <>
      <span className='flex flex-col items-center justify-center' data-testid='kangur-home-brand'>
        <span
          className='flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none'
          data-testid='kangur-home-logo'
        >
          <KangurHomeLogo idPrefix='kangur-primary-nav-logo' className='-translate-y-[1px]' />
        </span>
        <KangurHomeBetaBadge />
      </span>
      <span className='sr-only'>{navTranslations('home')}</span>
    </>
  ),
  docId: 'top_nav_home',
  href: onHomeClick ? undefined : homeHref,
  onClick: onHomeClick,
  targetPageKey: 'Game',
  testId: 'kangur-primary-nav-home',
  transition: {
    active: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: homeTransitionSourceId,
    }),
    acknowledgeMs: onHomeClick ? undefined : PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS,
    sourceId: onHomeClick ? undefined : homeTransitionSourceId,
  },
});

export const buildLessonsAction = ({
  activeTransitionSourceId,
  accessibleCurrentPage,
  isSixYearOld,
  lessonsHref,
  lessonsTransitionSourceId,
  mobileNavItemClassName,
  navTranslations,
  prefetchLessonsCatalogOnIntent,
  transitionPhase,
}: {
  activeTransitionSourceId: string | null;
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
  isSixYearOld: boolean;
  lessonsHref: string;
  lessonsTransitionSourceId: string;
  mobileNavItemClassName: string;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
  prefetchLessonsCatalogOnIntent: () => void;
  transitionPhase: KangurPrimaryNavigationTransitionPhase;
}): KangurNavActionConfig => ({
  active: accessibleCurrentPage === 'Lessons',
  ariaLabel: navTranslations('lessons'),
  className: mobileNavItemClassName,
  content: renderLessonsNavActionContent({
    isSixYearOld,
    label: navTranslations('lessons'),
  }),
  docId: 'top_nav_lessons',
  href: lessonsHref,
  onFocus: prefetchLessonsCatalogOnIntent,
  onMouseEnter: prefetchLessonsCatalogOnIntent,
  targetPageKey: 'Lessons',
  testId: 'kangur-primary-nav-lessons',
  transition: {
    active: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: lessonsTransitionSourceId,
    }),
    sourceId: lessonsTransitionSourceId,
  },
});

export const buildGamesLibraryAction = ({
  activeTransitionSourceId,
  accessibleCurrentPage,
  gamesLibraryHref,
  gamesLibraryTransitionSourceId,
  isSixYearOld,
  mobileNavItemClassName,
  navTranslations,
  transitionPhase,
}: {
  activeTransitionSourceId: string | null;
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
  gamesLibraryHref: string;
  gamesLibraryTransitionSourceId: string;
  isSixYearOld: boolean;
  mobileNavItemClassName: string;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
  transitionPhase: KangurPrimaryNavigationTransitionPhase;
}): KangurNavActionConfig => ({
  active: accessibleCurrentPage === 'GamesLibrary',
  ariaLabel: navTranslations('gamesLibrary'),
  className: mobileNavItemClassName,
  content: renderGamesLibraryNavActionContent({
    isSixYearOld,
    label: navTranslations('gamesLibrary'),
  }),
  docId: 'top_nav_games_library',
  href: gamesLibraryHref,
  targetPageKey: 'GamesLibrary',
  testId: 'kangur-primary-nav-games-library',
  transition: {
    active: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: gamesLibraryTransitionSourceId,
    }),
    sourceId: gamesLibraryTransitionSourceId,
  },
});

export const buildSubjectAction = ({
  className,
  isSixYearOld,
  isSubjectModalOpen,
  navTranslations,
  onOpen,
  subjectChoiceLabel,
  subjectDialogId,
  subjectVisual,
}: {
  className: string;
  isSixYearOld: boolean;
  isSubjectModalOpen: boolean;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
  onOpen: () => void;
  subjectChoiceLabel: string;
  subjectDialogId: string;
  subjectVisual: ReturnType<typeof getKangurSixYearOldSubjectVisual>;
}): KangurNavActionConfig => ({
  ariaControls: subjectDialogId,
  ariaExpanded: isSubjectModalOpen,
  ariaHasPopup: 'dialog',
  ariaLabel: navTranslations('subject.label'),
  className,
  content: resolveSubjectActionContent({
    isSixYearOld,
    label: subjectChoiceLabel,
    subjectVisual,
  }),
  docId: 'top_nav_subject_choice',
  onClick: onOpen,
  testId: 'kangur-primary-nav-subject',
  title: navTranslations('subject.currentTitle', { subject: subjectChoiceLabel }),
});

export const buildAgeGroupAction = ({
  ageGroupChoiceLabel,
  ageGroupDialogId,
  ageGroupVisual,
  className,
  isAgeGroupModalOpen,
  isSixYearOld,
  navTranslations,
  onOpen,
}: {
  ageGroupChoiceLabel: string;
  ageGroupDialogId: string;
  ageGroupVisual: ReturnType<typeof getKangurSixYearOldAgeGroupVisual>;
  className: string;
  isAgeGroupModalOpen: boolean;
  isSixYearOld: boolean;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
  onOpen: () => void;
}): KangurNavActionConfig => ({
  ariaControls: ageGroupDialogId,
  ariaExpanded: isAgeGroupModalOpen,
  ariaHasPopup: 'dialog',
  ariaLabel: navTranslations('ageGroup.label'),
  className,
  content: resolveAgeGroupActionContent({
    ageGroupVisual,
    isSixYearOld,
    label: ageGroupChoiceLabel,
  }),
  docId: 'top_nav_age_group_choice',
  onClick: onOpen,
  testId: 'kangur-primary-nav-age-group',
  title: navTranslations('ageGroup.currentTitle', { group: ageGroupChoiceLabel }),
});

export const buildDuelsAction = ({
  accessibleCurrentPage,
  activeTransitionSourceId,
  duelsHref,
  duelsTransitionSourceId,
  isSixYearOld,
  mobileNavItemClassName,
  navTranslations,
  transitionPhase,
}: {
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
  activeTransitionSourceId: string | null;
  duelsHref: string;
  duelsTransitionSourceId: string;
  isSixYearOld: boolean;
  mobileNavItemClassName: string;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
  transitionPhase: KangurPrimaryNavigationTransitionPhase;
}): KangurNavActionConfig => ({
  active: accessibleCurrentPage === 'Duels',
  ariaLabel: navTranslations('duels'),
  className: mobileNavItemClassName,
  content: resolveDuelsActionContent({
    isSixYearOld,
    label: navTranslations('duels'),
  }),
  docId: 'top_nav_duels',
  href: duelsHref,
  prefetch: false,
  targetPageKey: 'Duels',
  testId: 'kangur-primary-nav-duels',
  transition: {
    active: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: duelsTransitionSourceId,
    }),
    sourceId: duelsTransitionSourceId,
  },
});

export const buildParentDashboardAction = ({
  accessibleCurrentPage,
  activeTransitionSourceId,
  effectiveShowParentDashboard,
  isSixYearOld,
  mobileNavItemClassName,
  navTranslations,
  parentDashboardHref,
  parentDashboardTransitionSourceId,
  transitionPhase,
}: {
  accessibleCurrentPage: KangurPrimaryNavigationProps['currentPage'];
  activeTransitionSourceId: string | null;
  effectiveShowParentDashboard: boolean;
  isSixYearOld: boolean;
  mobileNavItemClassName: string;
  navTranslations: ReturnType<typeof useKangurPrimaryNavigationState>['navTranslations'];
  parentDashboardHref: string;
  parentDashboardTransitionSourceId: string;
  transitionPhase: KangurPrimaryNavigationTransitionPhase;
}): KangurNavActionConfig | null => {
  if (!effectiveShowParentDashboard) {
    return null;
  }

  return {
    active: accessibleCurrentPage === 'ParentDashboard',
    ariaLabel: navTranslations('parent'),
    className: mobileNavItemClassName,
    content: resolveParentDashboardActionContent({
      isSixYearOld,
      label: navTranslations('parent'),
    }),
    docId: 'top_nav_parent_dashboard',
    href: parentDashboardHref,
    targetPageKey: 'ParentDashboard',
    testId: 'kangur-primary-nav-parent-dashboard',
    transition: {
      active: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: parentDashboardTransitionSourceId,
      }),
      sourceId: parentDashboardTransitionSourceId,
    },
  };
};

export const buildTutorToggleAction = ({
  disableTutorLabel,
  enableTutorLabel,
  isTutorHidden,
  mobileNavItemClassName,
  onToggle,
  yellowPillActionClassName,
}: {
  disableTutorLabel: string;
  enableTutorLabel: string;
  isTutorHidden: boolean;
  mobileNavItemClassName: string;
  onToggle: () => void;
  yellowPillActionClassName: string;
}): KangurNavActionConfig => ({
  ariaLabel: isTutorHidden ? enableTutorLabel : disableTutorLabel,
  className: isTutorHidden ? yellowPillActionClassName : mobileNavItemClassName,
  content: resolveTutorToggleActionContent({
    disableTutorLabel,
    enableTutorLabel,
    isTutorHidden,
  }),
  docId: isTutorHidden ? 'kangur-ai-tutor-enable' : 'kangur-ai-tutor-disable',
  onClick: onToggle,
  testId: 'kangur-ai-tutor-toggle',
  title: isTutorHidden ? enableTutorLabel : disableTutorLabel,
  transition: {},
});
