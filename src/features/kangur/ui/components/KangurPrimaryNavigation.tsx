'use client';

import { QueryClientContext } from '@tanstack/react-query';
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
import { useLocale, useTranslations } from 'next-intl';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  CmsStorefrontAppearanceButtons,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
  isKangurEmbeddedBasePath,
} from '@/features/kangur/config/routing';
import {
  loadPersistedTutorVisibilityHidden,
  persistTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import {
  renderKangurChoiceDialog,
  type KangurChoiceDialogProps,
} from '@/features/kangur/ui/components/KangurChoiceDialog';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import { KangurElevatedUserMenu } from '@/features/kangur/ui/components/KangurElevatedUserMenu';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { KangurLanguageSwitcher } from '@/features/kangur/ui/components/KangurLanguageSwitcher';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTextField,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_TIGHT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurElevatedSession } from '@/features/kangur/ui/hooks/useKangurElevatedSession';
import {
  prefetchKangurLessonsCatalog,
} from '@/features/kangur/ui/hooks/useKangurLessonsCatalog';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import {
  DEFAULT_KANGUR_AGE_GROUP,
  KANGUR_AGE_GROUPS,
  getKangurDefaultSubjectForAgeGroup,
  getKangurSubjectsForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog-metadata';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  getKangurSixYearOldAgeGroupVisual,
  getKangurSixYearOldSubjectVisual,
} from '@/features/kangur/ui/constants/six-year-old-visuals';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import {
  KangurHomeBetaBadge,
  KangurPrimaryNavigationLoginAction,
} from './KangurPrimaryNavigation.components';
import type {
  KangurNavActionConfig,
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
export type {
  KangurPrimaryNavigationProps,
} from './KangurPrimaryNavigation.types';
import {
  getPrimaryNavigationFallbackCopy,
  ICON_CLASSNAME,
  isTransitionSourceActive,
  PRIMARY_NAV_ROUTE_ACKNOWLEDGE_MS,
  renderGamesLibraryNavActionContent,
  renderLessonsNavActionContent,
  renderNavAction,
} from './KangurPrimaryNavigation.utils';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';

function KangurChoiceDialog(props: KangurChoiceDialogProps): React.JSX.Element {
  return renderKangurChoiceDialog(props);
}

const resolveTutorFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>,
  value: string | null | undefined,
  polishDefault: string,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  if (locale !== 'pl' && value === polishDefault) {
    return fallback;
  }

  return value;
};

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
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const auth = useOptionalKangurAuth();
  const { elevatedUser: elevatedSessionSnapshot, isSuperAdmin } = useKangurElevatedSession();
  const storefrontAppearance = useOptionalCmsStorefrontAppearance();
  const kangurAppearance = useKangurStorefrontAppearance();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const queryClient = useContext(QueryClientContext);
  const locale = useLocale();
  const navTranslations = useTranslations('KangurNavigation');
  const normalizedLocale = normalizeSiteLocale(locale);
  const fallbackCopy = useMemo(
    () => getPrimaryNavigationFallbackCopy(normalizedLocale),
    [normalizedLocale]
  );
  const guestPlayerNameValue = typeof guestPlayerName === 'string' ? guestPlayerName : '';
  const guestPlayerPlaceholderText =
    guestPlayerNamePlaceholder ?? fallbackCopy.guestPlayerNamePlaceholder;
  const navigationLabel = navLabel ?? fallbackCopy.navLabel;
  const effectiveIsAuthenticated = auth?.isAuthenticated ?? isAuthenticated;
  const effectiveCanManageLearners = auth?.user
    ? Boolean(auth.user.canManageLearners)
    : canManageLearners;
  const effectiveShowParentDashboard = effectiveCanManageLearners && showParentDashboard;
  const authUser = auth?.user ?? null;
  const isLoggingOut = auth?.isLoggingOut ?? false;
  const isParentAccount = authUser?.actorType === 'parent';
  const activeLearner = authUser?.activeLearner ?? null;
  const activeLearnerId = activeLearner?.id?.trim() ?? '';
  const hasActiveLearner = activeLearnerId.length > 0;
  const activeLearnerName =
    activeLearner?.displayName?.trim() || activeLearner?.loginName?.trim() || null;
  const elevatedSessionUser = useMemo(() => {
    if (!elevatedSessionSnapshot) {
      return null;
    }

    return {
      ...elevatedSessionSnapshot,
      email: elevatedSessionSnapshot.email ?? authUser?.email?.trim() ?? null,
      name: elevatedSessionSnapshot.name ?? authUser?.full_name?.trim() ?? null,
    };
  }, [authUser?.email, authUser?.full_name, elevatedSessionSnapshot]);
  const profileDisplayName = activeLearnerName || authUser?.full_name?.trim() || null;
  const profileLabel = profileDisplayName
    ? fallbackCopy.profileLabelWithName(profileDisplayName)
    : fallbackCopy.profileLabel;
  const profileAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const shouldRenderElevatedUserMenu = effectiveIsAuthenticated && Boolean(elevatedSessionUser);
  const shouldRenderProfileMenu =
    effectiveIsAuthenticated && !shouldRenderElevatedUserMenu && (!isParentAccount || hasActiveLearner);
  const canAccessGamesLibrary = effectiveIsAuthenticated && isSuperAdmin;
  const accessibleCurrentPage = currentPage;
  const effectiveHomeActive = homeActive ?? accessibleCurrentPage === 'Game';
  const learnerProfileIsActive = accessibleCurrentPage === 'LearnerProfile';
  const isCoarsePointer = useKangurCoarsePointer();
  const isMobileViewport = useKangurMobileBreakpoint();
  const loginActionRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuPreviousFocusRef = useRef<HTMLElement | null>(null);
  const lessonsPrefetchTriggeredRef = useRef(false);
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAgeGroupModalOpen, setIsAgeGroupModalOpen] = useState(false);
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
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
  const [isEditingGuestPlayerName, setIsEditingGuestPlayerName] = useState(
    !(guestPlayerName?.trim() ?? '')
  );
  const showGuestPlayerNameInput =
    !effectiveIsAuthenticated &&
    typeof guestPlayerName === 'string' &&
    typeof onGuestPlayerNameChange === 'function';
  const hasGuestPlayerName = (guestPlayerName?.trim() ?? '').length > 0;
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
      })),
    [ageGroup, isSixYearOld, normalizedLocale, setAgeGroup]
  );
  const mobileNavItemClassName = `max-sm:col-span-1 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
  const mobileWideNavItemClassName = `max-sm:col-span-2 max-sm:min-w-0 max-sm:w-full max-sm:justify-center ${isCoarsePointer ? 'max-sm:min-h-12 max-sm:px-4' : 'max-sm:px-3'}`;
  const yellowPillActionClassName = `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`;
  const amberPillActionClassName = `border-amber-300/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.96)_0%,rgba(253,230,138,0.92)_100%)] px-4 text-amber-800 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.58)] ring-1 ring-amber-200/90 hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(253,230,138,0.94)_100%)] hover:text-amber-900 ${mobileWideNavItemClassName}`;
  const closeMobileMenu = useCallback((): void => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback((): void => setIsMobileMenuOpen((prev) => !prev), []);
  const prefetchLessonsCatalogOnIntent = useCallback((): void => {
    if (accessibleCurrentPage === 'Lessons' || lessonsPrefetchTriggeredRef.current) {
      return;
    }

    lessonsPrefetchTriggeredRef.current = true;
    void prefetchKangurLessonsCatalog(queryClient, {
      ageGroup,
      enabledOnly: true,
      subject,
    });
  }, [accessibleCurrentPage, ageGroup, queryClient, subject]);

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  useEffect(() => {
    if (!isMobileViewport) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [accessibleCurrentPage]);

  useEffect(() => {
    lessonsPrefetchTriggeredRef.current = false;
  }, [accessibleCurrentPage, ageGroup, subject]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return (): void => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobileMenuOpen) {
      mobileMenuPreviousFocusRef.current = document.activeElement as HTMLElement | null;
      return;
    }
    if (mobileMenuPreviousFocusRef.current) {
      mobileMenuPreviousFocusRef.current.focus();
      mobileMenuPreviousFocusRef.current = null;
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === 'undefined') return;
    const closeButton = document.getElementById('kangur-mobile-menu-close');
    if (closeButton instanceof HTMLElement) {
      closeButton.focus();
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const menu = mobileMenuRef.current;
    if (!menu || typeof document === 'undefined') return;
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
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
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
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!showGuestPlayerNameInput) {
      setIsEditingGuestPlayerName(false);
      return;
    }

    if (!hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
    }
  }, [hasGuestPlayerName, showGuestPlayerNameInput]);

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

  const handleGuestPlayerNameChange = (value: string): void => {
    onGuestPlayerNameChange?.(value);
  };

  const commitGuestPlayerName = (): void => {
    if (!showGuestPlayerNameInput || !hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
      return;
    }

    const trimmedValue = guestPlayerName.trim();
    if (trimmedValue !== guestPlayerName) {
      handleGuestPlayerNameChange(trimmedValue);
    }
    setIsEditingGuestPlayerName(false);
  };

  const logoutAction: KangurNavActionConfig = {
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

  const buildActionWithClose = (
    action: KangurNavActionConfig,
    onActionClick?: () => void
  ): KangurNavActionConfig => {
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
  };

  const renderAuthActions = (onActionClick?: () => void): React.ReactNode => {
    if (effectiveIsAuthenticated) {
      return renderNavAction(buildActionWithClose(logoutAction, onActionClick));
    }

    if (!onLogin && !showGuestPlayerNameInput) {
      return null;
    }

    return (
      <>
        {showGuestPlayerNameInput ? (
          isEditingGuestPlayerName || !hasGuestPlayerName ? (
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
          ) : (
            <KangurButton
              className='w-full justify-start px-3 text-left sm:w-auto sm:min-w-[180px]'
              data-doc-id='profile_guest_player_name_display'
              onClick={() => setIsEditingGuestPlayerName(true)}
              size='md'
              type='button'
              variant='navigation'
            >
              <span className='truncate'>{guestPlayerName.trim()}</span>
            </KangurButton>
          )
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
  };

  const homeAction: KangurNavActionConfig = {
    active: effectiveHomeActive,
    ariaLabel: navTranslations('home'),
    className: `px-3 sm:px-4 ${mobileNavItemClassName}`,
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
  };

  const lessonsAction: KangurNavActionConfig = {
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
  };

  const gamesLibraryAction: KangurNavActionConfig = {
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
  };

  const subjectAction: KangurNavActionConfig = {
    ariaControls: subjectDialogId,
    ariaExpanded: isSubjectModalOpen,
    ariaHasPopup: 'dialog',
    ariaLabel: navTranslations('subject.label'),
    className: yellowPillActionClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        detail={subjectVisual.detail}
        detailClassName='text-sm font-bold'
        detailTestId='kangur-primary-nav-subject-detail'
        icon={subjectVisual.icon}
        iconClassName='text-lg'
        iconTestId='kangur-primary-nav-subject-icon'
        label={subjectChoiceLabel}
      />
    ) : (
      <>
        <BookCheck aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{subjectChoiceLabel}</span>
      </>
    ),
    docId: 'top_nav_subject_choice',
    onClick: () => setIsSubjectModalOpen(true),
    testId: 'kangur-primary-nav-subject',
    title: navTranslations('subject.currentTitle', { subject: subjectChoiceLabel }),
  };

  const ageGroupAction: KangurNavActionConfig = {
    ariaControls: ageGroupDialogId,
    ariaExpanded: isAgeGroupModalOpen,
    ariaHasPopup: 'dialog',
    ariaLabel: navTranslations('ageGroup.label'),
    className: amberPillActionClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        detail={ageGroupVisual.detail}
        detailClassName='text-sm font-bold'
        detailTestId='kangur-primary-nav-age-group-detail'
        icon={ageGroupVisual.icon}
        iconClassName='text-lg'
        iconTestId='kangur-primary-nav-age-group-icon'
        label={ageGroupChoiceLabel}
      />
    ) : (
      <>
        <Users aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{ageGroupChoiceLabel}</span>
      </>
    ),
    docId: 'top_nav_age_group_choice',
    onClick: () => setIsAgeGroupModalOpen(true),
    testId: 'kangur-primary-nav-age-group',
    title: navTranslations('ageGroup.currentTitle', { group: ageGroupChoiceLabel }),
  };

  const duelsAction: KangurNavActionConfig = {
    active: accessibleCurrentPage === 'Duels',
    ariaLabel: navTranslations('duels'),
    className: mobileNavItemClassName,
    content: isSixYearOld ? (
      <KangurVisualCueContent
        icon={<Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
        iconTestId='kangur-primary-nav-duels-icon'
        label={navTranslations('duels')}
      />
    ) : (
      <>
        <Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{navTranslations('duels')}</span>
      </>
    ),
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
  };

  const parentDashboardAction: KangurNavActionConfig | null = effectiveShowParentDashboard
    ? {
        active: accessibleCurrentPage === 'ParentDashboard',
        ariaLabel: navTranslations('parent'),
        className: mobileNavItemClassName,
        content: isSixYearOld ? (
          <KangurVisualCueContent
            icon={<LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />}
            iconTestId='kangur-primary-nav-parent-dashboard-icon'
            label={navTranslations('parent')}
          />
        ) : (
          <>
            <LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span className='truncate'>{navTranslations('parent')}</span>
          </>
        ),
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
      }
    : null;

  const tutorToggleAction: KangurNavActionConfig = {
    ariaLabel: isTutorHidden ? enableTutorLabel : disableTutorLabel,
    className: isTutorHidden ? yellowPillActionClassName : mobileNavItemClassName,
    content: (
      <>
        <BrainCircuit aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{isTutorHidden ? enableTutorLabel : disableTutorLabel}</span>
      </>
    ),
    docId: isTutorHidden ? 'kangur-ai-tutor-enable' : 'kangur-ai-tutor-disable',
    onClick: () => {
      const nextHidden = !isTutorHidden;
      persistTutorVisibilityHidden(nextHidden);
      if (!nextHidden && tutor?.enabled) {
        tutor.openChat();
      }
    },
    testId: 'kangur-ai-tutor-toggle',
    title: isTutorHidden ? enableTutorLabel : disableTutorLabel,
    transition: {},
  };

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
  const appearanceControls = storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      className='max-sm:w-full max-sm:justify-start'
      label='Kangur appearance'
      modeLabels={kangurAppearanceLabels}
      modes={[...kangurAppearanceModes]}
      testId='kangur-primary-nav-appearance-controls'
      tone={kangurAppearance.tone}
    />
  ) : null;
  const appearanceControlsInline = storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      className='justify-start'
      label='Kangur appearance'
      modeLabels={kangurAppearanceLabels}
      modes={[...kangurAppearanceModes]}
      testId='kangur-primary-nav-appearance-controls-inline'
      tone={kangurAppearance.tone}
    />
  ) : null;

  const renderPrimaryActions = (options?: {
    inlineAppearanceWithTutor?: boolean;
    leading?: React.ReactNode;
    onActionClick?: () => void;
    wrapperClassName?: string;
  }): React.ReactNode => {
    const { inlineAppearanceWithTutor, leading, onActionClick, wrapperClassName } = options ?? {};
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
    const tutorRow =
      isTutorHidden
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
  };

  const renderUtilityActions = (options?: {
    hideAppearanceControls?: boolean;
    hideLanguageSwitcher?: boolean;
    onActionClick?: () => void;
    testId?: string;
    wrapperClassName?: string;
  }): React.ReactNode => {
    const {
      hideAppearanceControls,
      hideLanguageSwitcher,
      onActionClick,
      testId = 'kangur-primary-nav-utility-actions',
      wrapperClassName,
    } = options ?? {};
    const authActions = renderAuthActions(onActionClick);
    const resolvedAppearanceControls = hideAppearanceControls ? null : appearanceControls;
    const resolvedShouldRenderLanguageSwitcher =
      shouldRenderLanguageSwitcher && !hideLanguageSwitcher;

    if (
      !resolvedShouldRenderLanguageSwitcher &&
      !resolvedAppearanceControls &&
      !rightAccessory &&
      !parentDashboardAction &&
      !shouldRenderElevatedUserMenu &&
      !shouldRenderProfileMenu &&
      !authActions
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
        {resolvedShouldRenderLanguageSwitcher ? (
          <KangurLanguageSwitcher
            basePath={basePath}
            className={mobileNavItemClassName}
            currentPage={accessibleCurrentPage}
            forceFallbackPath={forceLanguageSwitcherFallbackPath}
          />
        ) : null}
        {resolvedAppearanceControls}
        {rightAccessory}
        {parentDashboardAction
          ? renderNavAction(buildActionWithClose(parentDashboardAction, onActionClick))
          : null}
        {shouldRenderElevatedUserMenu && elevatedSessionUser ? (
          <KangurElevatedUserMenu
            adminLabel={fallbackCopy.adminLabel}
            logoutLabel={fallbackCopy.logoutLabel}
            onLogout={onLogout}
            profile={
              !isParentAccount || hasActiveLearner
                ? {
                    href: profileHref,
                    label: profileLabel,
                  }
                : null
            }
            triggerAriaLabel={fallbackCopy.avatarLabel}
            triggerClassName={
              isCoarsePointer
                ? 'min-h-12 min-w-12 touch-manipulation select-none active:scale-[0.985]'
                : undefined
            }
            user={elevatedSessionUser}
          />
        ) : null}
        {shouldRenderProfileMenu ? (
          <KangurProfileMenu
            avatar={profileAvatar}
            label={profileLabel}
            profile={{ href: profileHref, isActive: learnerProfileIsActive }}
            transitionSourceId={profileTransitionSourceId}
            triggerClassName={mobileNavItemClassName}
          />
        ) : null}
        {authActions}
      </div>
    );
  };

  const mobileMenuLabel = isMobileMenuOpen
    ? navTranslations('mobileMenu.close')
    : navTranslations('mobileMenu.open');
  const mobileMenuId = 'kangur-mobile-menu';
  const mobileMenuTitleId = 'kangur-mobile-menu-title';
  const mobileMenuDescriptionId = 'kangur-mobile-menu-description';
  const mobileMenuCloseButton = (
    <KangurPanelCloseButton
      aria-label={navTranslations('mobileMenu.close')}
      id='kangur-mobile-menu-close'
      onClick={closeMobileMenu}
      variant='chat'
    />
  );
  const mobileNav = (
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
  );
  const desktopNav = (
    <KangurTopNavGroup label={navigationLabel}>
      {renderPrimaryActions()}
      {renderUtilityActions()}
    </KangurTopNavGroup>
  );
  const leftContent = (
    <>
      <div aria-hidden={isMobileViewport} className='hidden w-full min-w-0 sm:block'>
        {desktopNav}
      </div>
      <div aria-hidden={!isMobileViewport} className='w-full min-w-0 sm:hidden'>
        {mobileNav}
      </div>
    </>
  );
  const shouldRenderMobileAppearanceHeader = Boolean(appearanceControlsInline);
  const shouldRenderMobileLanguageHeader = shouldRenderLanguageSwitcher;
  const shouldHideMobileAppearanceControls = shouldRenderMobileAppearanceHeader;
  const shouldHideMobileLanguageSwitcher = shouldRenderMobileLanguageHeader;
  const mobileMenuOverlay = isMobileViewport || isMobileMenuOpen ? (
    <div
      aria-hidden={!isMobileMenuOpen}
      className={`fixed inset-0 z-50 transition-opacity duration-200 sm:hidden ${
        isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <button
        aria-hidden='true'
        className='absolute inset-0 cursor-pointer border-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.72)_100%)] p-0 touch-manipulation active:opacity-95'
        onClick={closeMobileMenu}
        tabIndex={-1}
        type='button'
      />
      <div
        aria-describedby={mobileMenuDescriptionId}
        aria-labelledby={mobileMenuTitleId}
        aria-modal='true'
        className={`relative flex h-full w-full flex-col kangur-panel-gap overflow-y-auto px-4 pb-[calc(var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px)] pt-[calc(env(safe-area-inset-top)+20px)] transition-transform duration-200 min-[420px]:px-5 ${
          isMobileMenuOpen ? 'translate-y-0' : 'translate-y-4'
        }`}
        id={mobileMenuId}
        onClick={(event) => event.stopPropagation()}
        ref={mobileMenuRef}
        role='dialog'
        style={{
          backgroundColor: kangurAppearance.tone.background,
          color: kangurAppearance.tone.text,
        }}
      >
        <h2 className='sr-only' id={mobileMenuTitleId}>
          {navTranslations('mobileMenu.title')}
        </h2>
        <p className='sr-only' id={mobileMenuDescriptionId}>
          {navTranslations('mobileMenu.description')}
        </p>
        <KangurTopNavGroup className='w-full flex-col' label={navigationLabel}>
          <div className='flex w-full items-center gap-2' data-testid='kangur-primary-nav-mobile-header'>
            {shouldRenderMobileLanguageHeader || shouldRenderMobileAppearanceHeader ? (
              <div
                className='flex min-w-0 items-center gap-2'
                data-testid='kangur-primary-nav-mobile-header-actions'
              >
                {shouldRenderMobileLanguageHeader ? (
                  <KangurLanguageSwitcher
                    basePath={basePath}
                    currentPage={accessibleCurrentPage}
                    forceFallbackPath={forceLanguageSwitcherFallbackPath}
                  />
                ) : null}
                {shouldRenderMobileAppearanceHeader ? (
                  <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
                ) : null}
              </div>
            ) : null}
            <div className='ml-auto flex shrink-0 items-center'>{mobileMenuCloseButton}</div>
          </div>
          {renderPrimaryActions({
            inlineAppearanceWithTutor: false,
            onActionClick: closeMobileMenu,
            wrapperClassName: 'flex w-full flex-col gap-2',
          })}
          {renderUtilityActions({
            hideAppearanceControls: shouldHideMobileAppearanceControls,
            hideLanguageSwitcher: shouldHideMobileLanguageSwitcher,
            onActionClick: closeMobileMenu,
            testId: 'kangur-primary-nav-mobile-utility-actions',
            wrapperClassName: 'flex w-full flex-col gap-2',
          })}
        </KangurTopNavGroup>
      </div>
    </div>
  ) : null;

  const subjectModal = (
    <KangurChoiceDialog
      closeAriaLabel={navTranslations('subject.closeAriaLabel')}
      contentId={subjectDialogId}
      currentChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={subjectVisual.detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-subject-modal-current-detail'
            icon={subjectVisual.icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-current-icon'
            label={subjectChoiceLabel}
          />
        ) : (
          subjectChoiceLabel
        )
      }
      defaultChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={getKangurSixYearOldSubjectVisual(getKangurDefaultSubjectForAgeGroup(ageGroup)).detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-subject-modal-default-detail'
            icon={getKangurSixYearOldSubjectVisual(getKangurDefaultSubjectForAgeGroup(ageGroup)).icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-default-icon'
            label={defaultSubjectLabel}
          />
        ) : (
          defaultSubjectLabel
        )
      }
      doneAriaLabel='Gotowe'
      doneLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            icon='✅'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-done-icon'
            label='Gotowe'
          />
        ) : undefined
      }
      groupAriaLabel={navTranslations('subject.groupAriaLabel')}
      header={
        <KangurDialogMeta
          description={navTranslations('subject.dialogDescription')}
          title={navTranslations('subject.label')}
        />
      }
      onOpenChange={setIsSubjectModalOpen}
      open={isSubjectModalOpen}
      options={subjectOptions}
      title={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail='👆'
            detailClassName='text-sm'
            detailTestId='kangur-primary-nav-subject-modal-title-detail'
            icon='📚'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-subject-modal-title-icon'
            label={navTranslations('subject.label')}
          />
        ) : (
          navTranslations('subject.label')
        )
      }
    />
  );

  const ageGroupModal = (
    <KangurChoiceDialog
      closeAriaLabel={navTranslations('ageGroup.closeAriaLabel')}
      contentId={ageGroupDialogId}
      currentChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={ageGroupVisual.detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-age-group-modal-current-detail'
            icon={ageGroupVisual.icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-current-icon'
            label={ageGroupChoiceLabel}
          />
        ) : (
          ageGroupChoiceLabel
        )
      }
      defaultChoiceLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail={getKangurSixYearOldAgeGroupVisual(
              KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP
            ).detail}
            detailClassName='text-sm font-bold'
            detailTestId='kangur-primary-nav-age-group-modal-default-detail'
            icon={getKangurSixYearOldAgeGroupVisual(
              KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP
            ).icon}
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-default-icon'
            label={defaultAgeGroupLabel}
          />
        ) : (
          defaultAgeGroupLabel
        )
      }
      doneAriaLabel='Gotowe'
      doneLabel={
        isSixYearOld ? (
          <KangurVisualCueContent
            icon='✅'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-done-icon'
            label='Gotowe'
          />
        ) : undefined
      }
      groupAriaLabel={navTranslations('ageGroup.groupAriaLabel')}
      header={
        <KangurDialogMeta
          description={navTranslations('ageGroup.dialogDescription')}
          title={navTranslations('ageGroup.label')}
        />
      }
      onOpenChange={setIsAgeGroupModalOpen}
      open={isAgeGroupModalOpen}
      options={ageGroupOptions}
      title={
        isSixYearOld ? (
          <KangurVisualCueContent
            detail='👆'
            detailClassName='text-sm'
            detailTestId='kangur-primary-nav-age-group-modal-title-detail'
            icon='👥'
            iconClassName='text-lg'
            iconTestId='kangur-primary-nav-age-group-modal-title-icon'
            label={navTranslations('ageGroup.label')}
          />
        ) : (
          navTranslations('ageGroup.label')
        )
      }
    />
  );

  return (
    <>
      <KangurPageTopBar
        className={className}
        contentClassName={contentClassName}
        left={leftContent}
      />
      {mobileMenuOverlay}
      {isSubjectModalOpen ? subjectModal : null}
      {isAgeGroupModalOpen ? ageGroupModal : null}
    </>
  );
}

export default KangurPrimaryNavigation;
