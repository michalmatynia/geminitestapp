'use client';

import {
  BookOpen,
  BookCheck,
  BrainCircuit,
  Users,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import {
  CmsStorefrontAppearanceButtons,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import { KANGUR_TIGHT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
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
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { getKangurAvatarById } from '@/features/kangur/ui/avatars/catalog';
import { KangurChoiceDialog } from '@/features/kangur/ui/components/KangurChoiceDialog';
import { KangurDialogHeader } from '@/features/kangur/ui/components/KangurDialogHeader';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { KangurLanguageSwitcher } from '@/features/kangur/ui/components/KangurLanguageSwitcher';
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTextField,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  DEFAULT_KANGUR_AGE_GROUP,
  KANGUR_AGE_GROUPS,
  getKangurDefaultSubjectForAgeGroup,
  getKangurSubjectsForAgeGroup,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';

type KangurPrimaryNavigationPage =
  | 'Competition'
  | 'Game'
  | 'Lessons'
  | 'Tests'
  | 'LearnerProfile'
  | 'ParentDashboard'
  | 'Duels'
  | 'SocialUpdates';

type KangurNavActionConfig = {
  active?: boolean;
  ariaLabel?: string;
  className?: string;
  content: React.ReactNode;
  docId: string;
  elementRef?: React.Ref<HTMLButtonElement>;
  href?: string;
  onClick?: () => void;
  targetPageKey?: KangurPrimaryNavigationPage;
  testId?: string;
  title?: string;
  transition?: {
    active?: boolean;
    acknowledgeMs?: number;
    sourceId?: string;
  };
};

type KangurPrimaryNavigationProps = {
  basePath: string;
  canManageLearners?: boolean;
  className?: string;
  contentClassName?: string;
  currentPage: KangurPrimaryNavigationPage;
  guestPlayerName?: string;
  guestPlayerNamePlaceholder?: string;
  homeActive?: boolean;
  isAuthenticated: boolean;
  navLabel?: string;
  onCreateAccount?: () => void;
  onGuestPlayerNameChange?: (value: string) => void;
  onHomeClick?: () => void;
  onLogin?: () => void;
  onLogout: () => void;
  rightAccessory?: React.ReactNode;
  showParentDashboard?: boolean;
};

export type { KangurPrimaryNavigationProps };

const ICON_CLASSNAME = 'h-[18px] w-[18px] sm:h-5 sm:w-5';
const NAVIGATION_TRANSITION_ACKNOWLEDGE_MS = 110;

const isTransitionSourceActive = ({
  activeTransitionSourceId,
  transitionPhase,
  transitionSourceId,
}: {
  activeTransitionSourceId?: string | null;
  transitionPhase?:
    | 'acknowledging'
    | 'idle'
    | 'pending'
    | 'waiting_for_ready'
    | 'revealing';
  transitionSourceId?: string;
}): boolean =>
  Boolean(
    transitionSourceId &&
      activeTransitionSourceId === transitionSourceId &&
      transitionPhase &&
      transitionPhase !== 'idle'
  );

const renderNavAction = (config: KangurNavActionConfig): React.JSX.Element => {
  const { content, ...action } = config;
  return <KangurNavAction {...action}>{content}</KangurNavAction>;
};

export function KangurPrimaryNavigation({
  basePath,
  canManageLearners = false,
  className,
  contentClassName,
  currentPage,
  guestPlayerName,
  guestPlayerNamePlaceholder = 'Wpisz imię gracza...',
  homeActive = currentPage === 'Game',
  isAuthenticated,
  navLabel = 'Główna nawigacja Kangur',
  onCreateAccount,
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
  const storefrontAppearance = useOptionalCmsStorefrontAppearance();
  const kangurAppearance = useKangurStorefrontAppearance();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const guestPlayerNameValue = typeof guestPlayerName === 'string' ? guestPlayerName : '';
  const guestPlayerPlaceholderText = guestPlayerNamePlaceholder;
  const navigationLabel = navLabel;
  const topBarClassName = className;
  const topBarContentClassName = contentClassName;
  const learnerProfileIsActive = currentPage === 'LearnerProfile';
  const effectiveIsAuthenticated = auth?.isAuthenticated ?? isAuthenticated;
  const effectiveCanManageLearners = auth?.user
    ? Boolean(auth.user.canManageLearners)
    : canManageLearners;
  const effectiveShowParentDashboard = effectiveCanManageLearners && showParentDashboard;
  const authUser = auth?.user ?? null;
  const isParentAccount = authUser?.actorType === 'parent';
  const activeLearner = authUser?.activeLearner ?? null;
  const activeLearnerId = activeLearner?.id?.trim() ?? '';
  const hasActiveLearner = activeLearnerId.length > 0;
  const activeLearnerName =
    activeLearner?.displayName?.trim() || activeLearner?.loginName?.trim() || null;
  const profileDisplayName = activeLearnerName || authUser?.full_name?.trim() || null;
  const profileLabel = profileDisplayName ? `Profil ${profileDisplayName}` : 'Profil';
  const profileAvatar = getKangurAvatarById(activeLearner?.avatarId);
  const shouldRenderProfileMenu =
    effectiveIsAuthenticated && (!isParentAccount || hasActiveLearner);
  const mobileNavItemClassName =
    'max-sm:col-span-1 max-sm:min-w-0 max-sm:w-full max-sm:justify-center max-sm:px-3';
  const mobileWideNavItemClassName =
    'max-sm:col-span-2 max-sm:min-w-0 max-sm:w-full max-sm:justify-center max-sm:px-3';
  const mobileAuthActionClassName = mobileNavItemClassName;
  const { entry: createAccountActionContent } = useKangurPageContentEntry(
    'shared-nav-create-account-action'
  );
  const { entry: loginActionContent } = useKangurPageContentEntry('shared-nav-login-action');
  const createAccountActionRef = useRef<HTMLButtonElement | null>(null);
  const loginActionRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuPreviousFocusRef = useRef<HTMLElement | null>(null);
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAgeGroupModalOpen, setIsAgeGroupModalOpen] = useState(false);
  const locale = useLocale();
  const navTranslations = useTranslations('KangurNavigation');
  const { subject, setSubject } = useKangurSubjectFocus();
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const enableTutorLabel =
    tutorContent.common.enableTutorLabel ?? tutorContent.navigation.restoreTutorLabel;
  const disableTutorLabel = tutorContent.common.disableTutorAria ?? 'Wyłącz AI Tutora';
  const [isEditingGuestPlayerName, setIsEditingGuestPlayerName] = useState(
    !(guestPlayerName?.trim() ?? '')
  );
  const showGuestPlayerNameInput =
    !effectiveIsAuthenticated &&
    typeof guestPlayerName === 'string' &&
    typeof onGuestPlayerNameChange === 'function';
  const hasGuestPlayerName = (guestPlayerName?.trim() ?? '').length > 0;
  const homeHref = getKangurHomeHref(basePath);
  const lessonsHref = createPageUrl('Lessons', basePath);
  const duelsHref = createPageUrl('Duels', basePath);
  const parentDashboardHref = createPageUrl('ParentDashboard', basePath);
  const profileHref = createPageUrl('LearnerProfile', basePath);
  const transitionPhase = routeTransitionState?.transitionPhase ?? 'idle';
  const activeTransitionSourceId = routeTransitionState?.activeTransitionSourceId ?? null;
  const homeTransitionSourceId = 'kangur-primary-nav:home';
  const lessonsTransitionSourceId = 'kangur-primary-nav:lessons';
  const duelsTransitionSourceId = 'kangur-primary-nav:duels';
  const profileTransitionSourceId = 'kangur-primary-nav:profile';
  const parentDashboardTransitionSourceId = 'kangur-primary-nav:parent-dashboard';
  const subjectChoiceLabel = getLocalizedKangurSubjectLabel(subject, locale);
  const ageGroupChoiceLabel = getLocalizedKangurAgeGroupLabel(ageGroup, locale);
  const defaultSubjectLabel = getLocalizedKangurSubjectLabel(
    getKangurDefaultSubjectForAgeGroup(ageGroup),
    locale
  );
  const defaultAgeGroupLabel =
    getLocalizedKangurAgeGroupLabel(
      KANGUR_AGE_GROUPS.find((group) => group.default)?.id ?? DEFAULT_KANGUR_AGE_GROUP,
      locale
    );
  const availableSubjects = getKangurSubjectsForAgeGroup(ageGroup);
  const yellowPillActionClassName =
    `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`;
  const amberPillActionClassName =
    `border-amber-300/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.96)_0%,rgba(253,230,138,0.92)_100%)] px-4 text-amber-800 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.58)] ring-1 ring-amber-200/90 hover:border-amber-300 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(253,230,138,0.94)_100%)] hover:text-amber-900 ${mobileWideNavItemClassName}`;
  const closeMobileMenu = (): void => setIsMobileMenuOpen(false);
  const toggleMobileMenu = (): void => setIsMobileMenuOpen((prev) => !prev);

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  useEffect((): (() => void) | void => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia('(max-width: 639px)');
    const applyBreakpoint = (matches: boolean): void => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      setIsMobile(matches && width <= 639);
    };

    applyBreakpoint(media.matches);

    const handler = (event: MediaQueryListEvent): void => {
      applyBreakpoint(event.matches);
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
      return (): void => {
        media.removeEventListener('change', handler);
      };
    }

    media.addListener(handler);
    return (): void => {
      media.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile]);

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
      const firstElement = first;
      const lastElement = last;
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === firstElement || active === menu) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }
      if (active === lastElement) {
        event.preventDefault();
        firstElement.focus();
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

  const handleGuestPlayerNameChange = (value: string): void => {
    onGuestPlayerNameChange?.(value);
  };

  useKangurTutorAnchor({
    id: 'kangur-auth-create-account-action',
    kind: 'create_account_action',
    ref: createAccountActionRef,
    surface: 'auth',
    enabled: !effectiveIsAuthenticated && Boolean(onCreateAccount),
    priority: 140,
    metadata: {
      label: 'Utwórz konto',
    },
  });

  useKangurTutorAnchor({
    id: 'kangur-auth-login-action',
    kind: 'login_action',
    ref: loginActionRef,
    surface: 'auth',
    enabled: !effectiveIsAuthenticated && Boolean(onLogin),
    priority: 130,
    metadata: {
      label: 'Zaloguj się',
    },
  });

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
    content: (
      <>
        <LogOut aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>Wyloguj</span>
      </>
    ),
    docId: 'profile_logout',
    className: mobileNavItemClassName,
    onClick: onLogout,
    testId: 'kangur-primary-nav-logout',
  };
  const buildActionWithClose = (
    action: KangurNavActionConfig,
    onActionClick?: () => void
  ): KangurNavActionConfig => {
    if (!onActionClick) return action;
    const existingClick = action.onClick;
    return {
      ...action,
      onClick: () => {
        onActionClick();
        existingClick?.();
      },
    };
  };

  const renderAuthActions = (onActionClick?: () => void): React.ReactNode => {
    if (effectiveIsAuthenticated) {
      return renderNavAction(buildActionWithClose(logoutAction, onActionClick));
    }

    if (!onLogin && !onCreateAccount) {
      return null;
    }

    return (
      <>
        {showGuestPlayerNameInput ? (
          isEditingGuestPlayerName || !hasGuestPlayerName ? (
            <div className='w-full sm:w-[220px]'>
              <label className='sr-only' htmlFor='kangur-primary-nav-guest-player-name'>
                Imię gracza
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
        {onCreateAccount ? (
          renderNavAction(
            buildActionWithClose(
              {
                className: mobileAuthActionClassName,
                content: (
                  <>
                    <UserPlus aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
                    <span className='truncate'>
                      {createAccountActionContent?.title ?? 'Utwórz konto'}
                    </span>
                  </>
                ),
                docId: 'profile_create_account',
                elementRef: createAccountActionRef,
                onClick: onCreateAccount,
                testId: 'kangur-primary-nav-create-account',
                title: createAccountActionContent?.summary ?? undefined,
              },
              onActionClick
            )
          )
        ) : null}
        {onLogin ? (
          renderNavAction(
            buildActionWithClose(
              {
                className: mobileAuthActionClassName,
                content: (
                  <>
                    <LogIn aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
                    <span className='truncate'>
                      {loginActionContent?.title ?? 'Zaloguj się'}
                    </span>
                  </>
                ),
                docId: 'profile_login',
                elementRef: loginActionRef,
                onClick: onLogin,
                testId: 'kangur-primary-nav-login',
                title: loginActionContent?.summary ?? undefined,
              },
              onActionClick
            )
          )
        ) : null}
      </>
    );
  };

  const tutorToggleActionConfig: KangurNavActionConfig = {
    ariaLabel: isTutorHidden ? enableTutorLabel : disableTutorLabel,
    className: isTutorHidden
      ? yellowPillActionClassName
      : mobileNavItemClassName,
    content: (
      <>
        <BrainCircuit aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{isTutorHidden ? enableTutorLabel : disableTutorLabel}</span>
      </>
    ),
    docId: isTutorHidden ? 'kangur-ai-tutor-enable' : 'kangur-ai-tutor-disable',
    onClick: (): void => {
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
  const homeAction: KangurNavActionConfig = {
    active: homeActive,
    ariaLabel: navTranslations('home'),
    className: `px-3 sm:px-4 ${mobileNavItemClassName}`,
    content: (
      <>
        <span
          className='flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none'
          data-testid='kangur-home-logo'
        >
          <KangurHomeLogo
            idPrefix='kangur-primary-nav-logo'
            className='-translate-y-[1px]'
          />
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
      acknowledgeMs: onHomeClick ? undefined : NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
      sourceId: onHomeClick ? undefined : homeTransitionSourceId,
    },
  };
  const lessonsAction: KangurNavActionConfig = {
    active: currentPage === 'Lessons',
    className: mobileNavItemClassName,
    content: (
      <>
        <BookOpen aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{navTranslations('lessons')}</span>
      </>
    ),
    docId: 'top_nav_lessons',
    href: lessonsHref,
    targetPageKey: 'Lessons',
    testId: 'kangur-primary-nav-lessons',
    transition: {
      active: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: lessonsTransitionSourceId,
      }),
      acknowledgeMs: NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
      sourceId: lessonsTransitionSourceId,
    },
  };
  const subjectAction: KangurNavActionConfig = {
    ariaLabel: navTranslations('subject.label'),
    className: yellowPillActionClassName,
    content: (
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
    ariaLabel: navTranslations('ageGroup.label'),
    className: amberPillActionClassName,
    content: (
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
    active: currentPage === 'Duels',
    className: mobileNavItemClassName,
    content: (
      <>
        <Trophy aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>{navTranslations('duels')}</span>
      </>
    ),
    docId: 'top_nav_duels',
    href: duelsHref,
    targetPageKey: 'Duels',
    testId: 'kangur-primary-nav-duels',
    transition: {
      active: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: duelsTransitionSourceId,
      }),
      acknowledgeMs: NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
      sourceId: duelsTransitionSourceId,
    },
  };
  const parentDashboardAction: KangurNavActionConfig | null = effectiveShowParentDashboard
    ? {
      active: currentPage === 'ParentDashboard',
      content: (
        <>
          <LayoutGrid aria-hidden='true' className={ICON_CLASSNAME} strokeWidth={2.15} />
          <span className='truncate'>{navTranslations('parent')}</span>
        </>
      ),
      docId: 'top_nav_parent_dashboard',
      href: parentDashboardHref,
      targetPageKey: 'ParentDashboard',
      className: mobileNavItemClassName,
      testId: 'kangur-primary-nav-parent-dashboard',
      transition: {
        active: isTransitionSourceActive({
          activeTransitionSourceId,
          transitionPhase,
          transitionSourceId: parentDashboardTransitionSourceId,
        }),
        acknowledgeMs: NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
        sourceId: parentDashboardTransitionSourceId,
      },
    }
    : null;
  const kangurAppearanceModes = ['default', 'dawn', 'sunset', 'dark'] as const;
  const kangurAppearanceLabels = {
    default: 'Daily',
    dawn: 'Dawn',
    sunset: 'Sunset',
    dark: 'Nightly',
  };
  const shouldRenderLanguageSwitcher =
    !isKangurEmbeddedBasePath(basePath) &&
    DEFAULT_SITE_I18N_CONFIG.locales.filter((entry) => entry.enabled).length > 1;
  const appearanceControls = storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      tone={kangurAppearance.tone}
      className='max-sm:w-full max-sm:justify-start'
      label='Kangur appearance'
      testId='kangur-primary-nav-appearance-controls'
      modes={[...kangurAppearanceModes]}
      modeLabels={kangurAppearanceLabels}
    />
  ) : null;
  const appearanceControlsInline = storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      tone={kangurAppearance.tone}
      className='justify-start'
      label='Kangur appearance'
      testId='kangur-primary-nav-appearance-controls-inline'
      modes={[...kangurAppearanceModes]}
      modeLabels={kangurAppearanceLabels}
    />
  ) : null;
  const renderPrimaryActions = (options?: {
    onActionClick?: () => void;
    wrapperClassName?: string;
    inlineAppearanceWithTutor?: boolean;
    leading?: React.ReactNode;
  }): React.ReactNode => {
    const { onActionClick, wrapperClassName, inlineAppearanceWithTutor, leading } = options ?? {};
    const tutorInlineClassName = [tutorToggleActionConfig.className, 'max-sm:!w-auto']
      .filter(Boolean)
      .join(' ');
    const tutorInlineAction = renderNavAction(
      buildActionWithClose(
        {
          ...tutorToggleActionConfig,
          className: tutorInlineClassName,
        },
        onActionClick
      )
    );
    const tutorDefaultAction = renderNavAction(
      buildActionWithClose(tutorToggleActionConfig, onActionClick)
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
        {renderNavAction(buildActionWithClose(lessonsAction, onActionClick))}
        {renderNavAction(buildActionWithClose(duelsAction, onActionClick))}
        {renderNavAction(buildActionWithClose(subjectAction, onActionClick))}
        {renderNavAction(buildActionWithClose(ageGroupAction, onActionClick))}
        {tutorRow}
      </div>
    );
  };

  const renderUtilityActions = (options?: {
    onActionClick?: () => void;
    wrapperClassName?: string;
    hideAppearanceControls?: boolean;
    hideLanguageSwitcher?: boolean;
  }): React.ReactNode => {
    const { onActionClick, wrapperClassName, hideAppearanceControls, hideLanguageSwitcher } =
      options ?? {};
    const authActions = renderAuthActions(onActionClick);
    const resolvedAppearanceControls = hideAppearanceControls ? null : appearanceControls;
    const resolvedShouldRenderLanguageSwitcher =
      shouldRenderLanguageSwitcher && !hideLanguageSwitcher;

    if (
      !resolvedShouldRenderLanguageSwitcher &&
      !resolvedAppearanceControls &&
      !rightAccessory &&
      !parentDashboardAction &&
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
        data-testid='kangur-primary-nav-utility-actions'
      >
        {resolvedShouldRenderLanguageSwitcher ? (
          <KangurLanguageSwitcher
            basePath={basePath}
            className={mobileNavItemClassName}
            currentPage={currentPage}
          />
        ) : null}
        {resolvedAppearanceControls}
        {rightAccessory}
        {parentDashboardAction
          ? renderNavAction(buildActionWithClose(parentDashboardAction, onActionClick))
          : null}
        {shouldRenderProfileMenu ? (
          <KangurProfileMenu
            avatar={profileAvatar}
            label={profileLabel}
            profile={{ href: profileHref, isActive: learnerProfileIsActive }}
            transitionAcknowledgeMs={NAVIGATION_TRANSITION_ACKNOWLEDGE_MS}
            transitionSourceId={profileTransitionSourceId}
            triggerClassName={mobileNavItemClassName}
          />
        ) : null}
        {authActions}
      </div>
    );
  };

  const mobileMenuLabel = isMobileMenuOpen ? 'Zamknij menu' : 'Otwórz menu';
  const mobileMenuId = 'kangur-mobile-menu';
  const mobileMenuTitleId = 'kangur-mobile-menu-title';
  const mobileMenuCloseButton = (
    <KangurPanelCloseButton
      id='kangur-mobile-menu-close'
      aria-label='Zamknij menu'
      onClick={closeMobileMenu}
      variant='chat'
    />
  );
  const mobileNav = (
    <KangurTopNavGroup label={navigationLabel} className='border-0 p-0'>
      <KangurButton
        aria-label={mobileMenuLabel}
        aria-controls={mobileMenuId}
        aria-haspopup='dialog'
        aria-expanded={isMobileMenuOpen}
        className='glass-panel w-full justify-center rounded-[30px] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]'
        data-testid='kangur-primary-nav-mobile-toggle'
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
  const leftContent = isMobile ? mobileNav : desktopNav;
  const shouldRenderMobileAppearanceHeader = Boolean(appearanceControlsInline);
  const shouldRenderMobileLanguageHeader = shouldRenderLanguageSwitcher;
  const shouldHideMobileAppearanceControls = shouldRenderMobileAppearanceHeader;
  const shouldHideMobileLanguageSwitcher = shouldRenderMobileLanguageHeader;
  const mobileMenuOverlay = isMobile ? (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isMobileMenuOpen}
    >
      <button
        type='button'
        className='absolute inset-0 cursor-pointer border-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.72)_100%)] p-0'
        onClick={closeMobileMenu}
        aria-label='Close navigation menu'
        tabIndex={-1}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={mobileMenuTitleId}
        id={mobileMenuId}
        className={`relative flex h-full w-full flex-col kangur-panel-gap overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-[calc(env(safe-area-inset-top)+20px)] transition-transform duration-200 min-[420px]:px-5 ${
          isMobileMenuOpen ? 'translate-y-0' : 'translate-y-4'
        }`}
        style={{ backgroundColor: kangurAppearance.tone.background, color: kangurAppearance.tone.text }}
        onClick={(event) => event.stopPropagation()}
        ref={mobileMenuRef}
      >
        <h2 id={mobileMenuTitleId} className='sr-only'>
          Menu Kangur
        </h2>
        <KangurTopNavGroup label={navigationLabel} className='w-full flex-col'>
          <div
            className='flex w-full items-center gap-2'
            data-testid='kangur-primary-nav-mobile-header'
          >
            {shouldRenderMobileLanguageHeader || shouldRenderMobileAppearanceHeader ? (
              <div
                className='flex min-w-0 items-center gap-2'
                data-testid='kangur-primary-nav-mobile-header-actions'
              >
                {shouldRenderMobileLanguageHeader ? (
                  <KangurLanguageSwitcher basePath={basePath} currentPage={currentPage} />
                ) : null}
                {shouldRenderMobileAppearanceHeader ? (
                  <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
                ) : null}
              </div>
            ) : null}
            <div className='ml-auto flex shrink-0 items-center'>{mobileMenuCloseButton}</div>
          </div>
          {renderPrimaryActions({
            onActionClick: closeMobileMenu,
            wrapperClassName: 'flex w-full flex-col gap-2',
            inlineAppearanceWithTutor: false,
          })}
          {renderUtilityActions({
            onActionClick: closeMobileMenu,
            wrapperClassName: 'flex w-full flex-col gap-2',
            hideAppearanceControls: shouldHideMobileAppearanceControls,
            hideLanguageSwitcher: shouldHideMobileLanguageSwitcher,
          })}
        </KangurTopNavGroup>
      </div>
    </div>
  ) : null;
  const subjectModal = (
    <KangurChoiceDialog
      open={isSubjectModalOpen}
      onOpenChange={setIsSubjectModalOpen}
      header={
        <KangurDialogHeader
          title={navTranslations('subject.label')}
          description={navTranslations('subject.dialogDescription')}
        />
      }
      title={navTranslations('subject.label')}
      defaultChoiceLabel={defaultSubjectLabel}
      currentChoiceLabel={subjectChoiceLabel}
      closeAriaLabel={navTranslations('subject.closeAriaLabel')}
      groupAriaLabel={navTranslations('subject.groupAriaLabel')}
      options={availableSubjects.map((item) => ({
        id: item.id,
        label: getLocalizedKangurSubjectLabel(item.id, locale, item.label),
        isActive: subject === item.id,
        onSelect: () => setSubject(item.id),
      }))}
    />
  );
  const ageGroupModal = (
    <KangurChoiceDialog
      open={isAgeGroupModalOpen}
      onOpenChange={setIsAgeGroupModalOpen}
      header={
        <KangurDialogHeader
          title={navTranslations('ageGroup.label')}
          description={navTranslations('ageGroup.dialogDescription')}
        />
      }
      title={navTranslations('ageGroup.label')}
      defaultChoiceLabel={defaultAgeGroupLabel}
      currentChoiceLabel={ageGroupChoiceLabel}
      closeAriaLabel={navTranslations('ageGroup.closeAriaLabel')}
      groupAriaLabel={navTranslations('ageGroup.groupAriaLabel')}
      options={KANGUR_AGE_GROUPS.map((group) => ({
        id: group.id,
        label: getLocalizedKangurAgeGroupLabel(group.id, locale, group.label),
        isActive: ageGroup === group.id,
        onSelect: () => setAgeGroup(group.id),
      }))}
    />
  );

  return (
    <>
      <KangurPageTopBar
        className={topBarClassName}
        contentClassName={topBarContentClassName}
        left={leftContent}
      />
      {mobileMenuOverlay}
      {subjectModal}
      {ageGroupModal}
    </>
  );
}
