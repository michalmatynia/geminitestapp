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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CmsStorefrontAppearanceButtons,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
  isKangurEmbeddedBasePath,
} from '@/features/kangur/config/routing';
import { persistTutorVisibilityHidden } from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { KangurElevatedUserMenu } from '@/features/kangur/ui/components/KangurElevatedUserMenu';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTextField,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_TIGHT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
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
  KangurHomeBetaBadge,
  KangurPrimaryNavigationLoginAction,
} from './KangurPrimaryNavigation.components';
import {
  useKangurPrimaryNavigationLessonsPrefetchOnIntent,
  useKangurPrimaryNavigationState,
} from './KangurPrimaryNavigation.hooks';
import {
  buildKangurPrimaryNavigationAgeGroupDialog,
  buildKangurPrimaryNavigationSubjectDialog,
  KangurPrimaryNavigationChoiceDialogs,
  KangurPrimaryNavigationMobileMenuOverlay,
} from './KangurPrimaryNavigation.overlays';
import type {
  KangurNavActionConfig,
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
export type { KangurPrimaryNavigationProps } from './KangurPrimaryNavigation.types';
import {
  ICON_CLASSNAME,
  isTransitionSourceActive,
  PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS,
  renderGamesLibraryNavActionContent,
  renderLessonsNavActionContent,
  renderNavAction,
} from './KangurPrimaryNavigation.utils';

const KangurLanguageSwitcher = dynamic(() =>
  import('@/features/kangur/ui/components/KangurLanguageSwitcher').then((m) => ({
    default: m.KangurLanguageSwitcher,
  }))
);

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

function useKangurPrimaryNavigationRuntime({
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

function buildActionWithClose(
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

const buildHomeAction = ({
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
  transitionPhase: string;
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

const buildLessonsAction = ({
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
  transitionPhase: string;
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

const buildGamesLibraryAction = ({
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
  transitionPhase: string;
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

const buildSubjectAction = ({
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

const buildAgeGroupAction = ({
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

const buildDuelsAction = ({
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
  transitionPhase: string;
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

const buildParentDashboardAction = ({
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
  transitionPhase: string;
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

const buildTutorToggleAction = ({
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

const resolveAppearanceControls = ({
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

const resolveMobileMenuHeaderActions = ({
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

const resolveKangurPrimaryNavigationUtilityVisibility = ({
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

const buildPrimaryNavigationLogoutAction = ({
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

function KangurPrimaryNavigationAuthActions({
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

const resolveUtilityLanguageSwitcherNode = ({
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

const resolveUtilityParentDashboardNode = ({
  onActionClick,
  parentDashboardAction,
}: {
  onActionClick?: () => void;
  parentDashboardAction: KangurNavActionConfig | null;
}): React.ReactNode =>
  parentDashboardAction
    ? renderNavAction(buildActionWithClose(parentDashboardAction, onActionClick))
    : null;

const resolveUtilityElevatedUserMenuNode = ({
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

const resolveUtilityProfileMenuNode = ({
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

function KangurPrimaryNavigationPrimaryActions({
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

function KangurPrimaryNavigationUtilityActions({
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

const buildSubjectOptions = ({
  availableSubjects,
  isSixYearOld,
  normalizedLocale,
  setSubject,
  subject,
}: {
  availableSubjects: ReturnType<typeof getKangurSubjectsForAgeGroup>;
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

const buildAgeGroupOptions = ({
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
  const profileDisplayName = resolvePrimaryNavigationProfileDisplayName({
    activeLearner,
    authUser,
  });
  const profileLabel = resolvePrimaryNavigationLabel({
    fallbackCopy,
    profileDisplayName,
  });
  const canAccessGamesLibrary = effectiveIsAuthenticated && isSuperAdmin;
  const accessibleCurrentPage = currentPage;
  const effectiveHomeActive = homeActive ?? accessibleCurrentPage === 'Game';
  const learnerProfileIsActive = accessibleCurrentPage === 'LearnerProfile';
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
  const availableSubjects = useMemo(() => getKangurSubjectsForAgeGroup(ageGroup), [ageGroup]);
  const subjectOptions = useMemo(
    () =>
      buildSubjectOptions({
        availableSubjects,
        isSixYearOld,
        normalizedLocale,
        setSubject,
        subject,
      }),
    [availableSubjects, isSixYearOld, normalizedLocale, setSubject, subject]
  );
  const ageGroupOptions = useMemo(
    () =>
      buildAgeGroupOptions({
        ageGroup,
        isSixYearOld,
        normalizedLocale,
        setAgeGroup,
      }),
    [ageGroup, isSixYearOld, normalizedLocale, setAgeGroup]
  );
  const mobileNavItemClassName = `max-sm:col-span-1 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
  const mobileWideNavItemClassName = `max-sm:col-span-2 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
  const yellowPillActionClassName = `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`;
  const amberPillActionClassName = `border-amber-300/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.96)_0%,rgba(253,230,138,0.92)_100%)] px-4 text-amber-800 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.58)] ring-1 ring-amber-200/90 hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(253,230,138,0.94)_100%)] hover:text-amber-900 ${mobileWideNavItemClassName}`;
  const enableTutorLabel = resolveTutorFallbackCopy(
    tutorContent.common.enableTutorLabel ?? tutorContent.navigation.restoreTutorLabel,
    fallbackCopy.enableTutorLabel
  );
  const disableTutorLabel = resolveTutorFallbackCopy(
    tutorContent.common.disableTutorAria,
    fallbackCopy.disableTutorLabel
  );
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
    homeTransitionSourceId,
    navTranslations,
    onHomeClick,
    transitionPhase,
  });
  const lessonsAction = buildLessonsAction({
    accessibleCurrentPage,
    activeTransitionSourceId,
    isSixYearOld,
    lessonsHref,
    lessonsTransitionSourceId,
    mobileNavItemClassName,
    navTranslations,
    prefetchLessonsCatalogOnIntent,
    transitionPhase,
  });
  const gamesLibraryAction = buildGamesLibraryAction({
    accessibleCurrentPage,
    activeTransitionSourceId,
    gamesLibraryHref,
    gamesLibraryTransitionSourceId,
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
    subjectDialogId,
    subjectVisual,
  });
  const ageGroupAction = buildAgeGroupAction({
    ageGroupChoiceLabel,
    ageGroupDialogId,
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
    duelsTransitionSourceId,
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
    parentDashboardTransitionSourceId,
    transitionPhase,
  });
  const tutorToggleAction = buildTutorToggleAction({
    disableTutorLabel,
    enableTutorLabel,
    isTutorHidden,
    mobileNavItemClassName,
    onToggle: () => {
      const nextHidden = !isTutorHidden;
      persistTutorVisibilityHidden(nextHidden);
      if (!nextHidden && tutor?.enabled) {
        tutor.openChat();
      }
    },
    yellowPillActionClassName,
  });
  const kangurAppearanceModes = useMemo(
    () => ['default', 'dawn', 'sunset', 'dark'] as const,
    []
  );
  const kangurAppearanceLabels = useMemo(
    () => ({
      default: 'Daily',
      dawn: 'Dawn',
      sunset: 'Sunset',
      dark: 'Nightly',
    }),
    []
  );
  const shouldRenderLanguageSwitcher =
    !isKangurEmbeddedBasePath(basePath) &&
    DEFAULT_SITE_I18N_CONFIG.locales.filter((entry) => entry.enabled).length > 1;
  const appearanceControls = resolveAppearanceControls({
    kangurAppearanceLabels,
    kangurAppearanceModes,
    kangurAppearanceTone: kangurAppearance.tone,
    storefrontAppearance,
  });
  const appearanceControlsInline = resolveAppearanceControls({
    inline: true,
    kangurAppearanceLabels,
    kangurAppearanceModes,
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
  const primaryActions = (
    <KangurPrimaryNavigationPrimaryActions
      ageGroupAction={ageGroupAction}
      appearanceControlsInline={appearanceControlsInline}
      canAccessGamesLibrary={canAccessGamesLibrary}
      duelsAction={duelsAction}
      gamesLibraryAction={gamesLibraryAction}
      homeAction={{ ...homeAction, className: `${homeAction.className} ${mobileNavItemClassName}` }}
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
      profileTransitionSourceId={profileTransitionSourceId}
      rightAccessory={rightAccessory}
      shouldRenderElevatedUserMenu={shouldRenderElevatedUserMenu}
      shouldRenderLanguageSwitcher={shouldRenderLanguageSwitcher}
      shouldRenderProfileMenu={shouldRenderProfileMenu}
    />
  );
  const mobileMenuLabel = isMobileMenuOpen
    ? navTranslations('mobileMenu.close')
    : navTranslations('mobileMenu.open');
  const mobileMenuId = 'kangur-mobile-menu';
  const leftContent = (
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
            onClick={toggleMobileMenu}
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
  const mobileMenuHeaderActions = resolveMobileMenuHeaderActions({
    appearanceControlsInline,
    basePath,
    currentPage: accessibleCurrentPage,
    forceLanguageSwitcherFallbackPath,
    shouldRenderLanguageSwitcher,
  });

  return (
    <>
      <KangurPageTopBar
        className={className}
        contentClassName={contentClassName}
        left={leftContent}
      />
      <KangurPrimaryNavigationMobileMenuOverlay
        closeMobileMenu={closeMobileMenu}
        closeMobileMenuLabel={navTranslations('mobileMenu.close')}
        headerActions={mobileMenuHeaderActions}
        isMobileMenuOpen={isMobileMenuOpen}
        isMobileViewport={isMobileViewport}
        menuDescription={navTranslations('mobileMenu.description')}
        menuId={mobileMenuId}
        menuRef={mobileMenuRef}
        menuTitle={navTranslations('mobileMenu.title')}
        navigationLabel={navigationLabel}
        primaryActions={
          <KangurPrimaryNavigationPrimaryActions
            ageGroupAction={ageGroupAction}
            appearanceControlsInline={appearanceControlsInline}
            canAccessGamesLibrary={canAccessGamesLibrary}
            duelsAction={duelsAction}
            gamesLibraryAction={gamesLibraryAction}
            homeAction={{ ...homeAction, className: `${homeAction.className} ${mobileNavItemClassName}` }}
            inlineAppearanceWithTutor={false}
            isTutorHidden={isTutorHidden}
            lessonsAction={lessonsAction}
            onActionClick={closeMobileMenu}
            subjectAction={subjectAction}
            tutorToggleAction={tutorToggleAction}
            wrapperClassName='flex w-full flex-col gap-2'
          />
        }
        textColor={kangurAppearance.tone.text}
        toneBackground={kangurAppearance.tone.background}
        utilityActions={
          <KangurPrimaryNavigationUtilityActions
            accessibleCurrentPage={accessibleCurrentPage}
            appearanceControls={appearanceControls}
            authActions={
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
            }
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
            profileTransitionSourceId={profileTransitionSourceId}
            rightAccessory={rightAccessory}
            shouldRenderElevatedUserMenu={shouldRenderElevatedUserMenu}
            shouldRenderLanguageSwitcher={shouldRenderLanguageSwitcher}
            shouldRenderProfileMenu={shouldRenderProfileMenu}
            testId='kangur-primary-nav-mobile-utility-actions'
            wrapperClassName='flex w-full flex-col gap-2'
          />
        }
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
          ageGroup,
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
