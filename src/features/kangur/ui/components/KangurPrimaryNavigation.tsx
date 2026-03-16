'use client';

import {
  BookOpen,
  BrainCircuit,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Star,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  CmsStorefrontAppearanceButtons,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/public';
import {
  appendKangurUrlParams,
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import {
  loadPersistedTutorVisibilityHidden,
  persistTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
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
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

type KangurPrimaryNavigationPage =
  | 'Game'
  | 'Lessons'
  | 'LearnerProfile'
  | 'ParentDashboard'
  | 'Duels';

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
  transitionActive?: boolean;
  transitionAcknowledgeMs?: number;
  transitionSourceId?: string;
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
  const {
    active = false,
    ariaLabel,
    className,
    content,
    docId,
    elementRef,
    href,
    onClick,
    targetPageKey,
    testId,
    title,
    transitionActive = false,
    transitionAcknowledgeMs,
    transitionSourceId,
  } = config;
  const variant = active || transitionActive ? 'navigationActive' : 'navigation';

  if (href) {
    return (
      <KangurButton
        asChild
        aria-current={active ? 'page' : undefined}
        aria-label={ariaLabel}
        className={className}
        data-doc-id={docId}
        data-nav-state={transitionActive ? 'transitioning' : 'idle'}
        data-testid={testId}
        onClick={onClick}
        size='md'
        title={title}
        variant={variant}
      >
        <Link
          href={href}
          targetPageKey={targetPageKey}
          transitionAcknowledgeMs={transitionAcknowledgeMs}
          transitionSourceId={transitionSourceId}
        >
          {content}
        </Link>
      </KangurButton>
    );
  }

  return (
    <KangurButton
      aria-current={active ? 'page' : undefined}
      aria-label={ariaLabel}
      className={className}
      data-doc-id={docId}
      data-nav-state={transitionActive ? 'transitioning' : 'idle'}
      data-testid={testId}
      onClick={onClick}
      ref={elementRef}
      size='md'
      title={title}
      type='button'
      variant={variant}
    >
      {content}
    </KangurButton>
  );
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
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const kangurMathHref = appendKangurUrlParams(
    homeHref,
    { quickStart: 'kangur' },
    basePath
  );
  const transitionPhase = routeTransitionState?.transitionPhase ?? 'idle';
  const activeTransitionSourceId = routeTransitionState?.activeTransitionSourceId ?? null;
  const homeTransitionSourceId = 'kangur-primary-nav:home';
  const lessonsTransitionSourceId = 'kangur-primary-nav:lessons';
  const duelsTransitionSourceId = 'kangur-primary-nav:duels';
  const kangurMathTransitionSourceId = 'kangur-primary-nav:kangur-math';
  const profileTransitionSourceId = 'kangur-primary-nav:profile';
  const parentDashboardTransitionSourceId = 'kangur-primary-nav:parent-dashboard';
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
        <LogOut className={ICON_CLASSNAME} strokeWidth={2.15} />
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
                    <UserPlus className={ICON_CLASSNAME} strokeWidth={2.15} />
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
                    <LogIn className={ICON_CLASSNAME} strokeWidth={2.15} />
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
      ? `border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800 ${mobileWideNavItemClassName}`
      : mobileNavItemClassName,
    content: (
      <>
        <BrainCircuit className={ICON_CLASSNAME} strokeWidth={2.15} />
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
  };
  const homeAction: KangurNavActionConfig = {
    active: homeActive,
    className: `px-3 sm:px-4 ${mobileNavItemClassName}`,
    content: (
      <>
        <span
          className='flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none'
          data-testid='kangur-home-logo'
        >
          <KangurHomeLogo idPrefix='kangur-primary-nav-logo' />
        </span>
        <span className='truncate'>Grajmy</span>
      </>
    ),
    docId: 'top_nav_home',
    href: onHomeClick ? undefined : homeHref,
    onClick: onHomeClick,
    targetPageKey: 'Game',
    testId: 'kangur-primary-nav-home',
    transitionActive: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: homeTransitionSourceId,
    }),
    transitionAcknowledgeMs: onHomeClick ? undefined : NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
    transitionSourceId: onHomeClick ? undefined : homeTransitionSourceId,
  };
  const lessonsAction: KangurNavActionConfig = {
    active: currentPage === 'Lessons',
    className: mobileNavItemClassName,
    content: (
      <>
        <BookOpen className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>Lekcje</span>
      </>
    ),
    docId: 'top_nav_lessons',
    href: lessonsHref,
    targetPageKey: 'Lessons',
    testId: 'kangur-primary-nav-lessons',
    transitionActive: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: lessonsTransitionSourceId,
    }),
    transitionAcknowledgeMs: NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
    transitionSourceId: lessonsTransitionSourceId,
  };
  const kangurMathAction: KangurNavActionConfig = {
    active: false,
    className: mobileNavItemClassName,
    content: (
      <>
        <Star className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>Kangur Matematyczny</span>
      </>
    ),
    docId: 'top_nav_kangur_math',
    href: kangurMathHref,
    targetPageKey: 'Game',
    testId: 'kangur-primary-nav-kangur-math',
    transitionActive: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: kangurMathTransitionSourceId,
    }),
    transitionAcknowledgeMs: NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
    transitionSourceId: kangurMathTransitionSourceId,
  };
  const duelsAction: KangurNavActionConfig = {
    active: currentPage === 'Duels',
    className: mobileNavItemClassName,
    content: (
      <>
        <Trophy className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span className='truncate'>Pojedynki</span>
      </>
    ),
    docId: 'top_nav_duels',
    href: duelsHref,
    targetPageKey: 'Duels',
    testId: 'kangur-primary-nav-duels',
    transitionActive: isTransitionSourceActive({
      activeTransitionSourceId,
      transitionPhase,
      transitionSourceId: duelsTransitionSourceId,
    }),
    transitionAcknowledgeMs: NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
    transitionSourceId: duelsTransitionSourceId,
  };
  const parentDashboardAction: KangurNavActionConfig | null = effectiveShowParentDashboard
    ? {
      active: currentPage === 'ParentDashboard',
      content: (
        <>
          <LayoutGrid className={ICON_CLASSNAME} strokeWidth={2.15} />
          <span className='truncate'>Rodzic</span>
        </>
      ),
      docId: 'top_nav_parent_dashboard',
      href: parentDashboardHref,
      targetPageKey: 'ParentDashboard',
      className: mobileNavItemClassName,
      testId: 'kangur-primary-nav-parent-dashboard',
      transitionActive: isTransitionSourceActive({
        activeTransitionSourceId,
        transitionPhase,
        transitionSourceId: parentDashboardTransitionSourceId,
      }),
      transitionAcknowledgeMs: NAVIGATION_TRANSITION_ACKNOWLEDGE_MS,
      transitionSourceId: parentDashboardTransitionSourceId,
    }
    : null;
  const kangurAppearanceModes = ['default', 'dawn', 'sunset', 'dark'] as const;
  const kangurAppearanceLabels = {
    default: 'Daily',
    dawn: 'Dawn',
    sunset: 'Sunset',
    dark: 'Nightly',
  };
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
  }): React.ReactNode => {
    const { onActionClick, wrapperClassName, inlineAppearanceWithTutor } = options ?? {};
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
      inlineAppearanceWithTutor && appearanceControlsInline ? (
        <div className='flex w-full items-center justify-center gap-2'>
          {tutorInlineAction}
          <div className='flex shrink-0 items-center'>{appearanceControlsInline}</div>
        </div>
      ) : (
        tutorDefaultAction
      );
    return (
      <div
        className={
          wrapperClassName ??
          'grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-nowrap sm:items-center'
        }
        data-testid='kangur-primary-nav-primary-actions'
      >
        {renderNavAction(buildActionWithClose(homeAction, onActionClick))}
        {renderNavAction(buildActionWithClose(lessonsAction, onActionClick))}
        {renderNavAction(buildActionWithClose(kangurMathAction, onActionClick))}
        {renderNavAction(buildActionWithClose(duelsAction, onActionClick))}
        {tutorRow}
      </div>
    );
  };

  const renderUtilityActions = (options?: {
    onActionClick?: () => void;
    wrapperClassName?: string;
    hideAppearanceControls?: boolean;
  }): React.ReactNode => {
    const { onActionClick, wrapperClassName, hideAppearanceControls } = options ?? {};
    const authActions = renderAuthActions(onActionClick);
    const resolvedAppearanceControls = hideAppearanceControls ? null : appearanceControls;

    if (
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
          'ml-auto flex w-full flex-col items-stretch justify-end gap-2 max-sm:ml-0 max-sm:justify-start sm:w-auto sm:flex-row sm:flex-wrap sm:items-center'
        }
        data-testid='kangur-primary-nav-utility-actions'
      >
        {resolvedAppearanceControls}
        {rightAccessory}
        {parentDashboardAction
          ? renderNavAction(buildActionWithClose(parentDashboardAction, onActionClick))
          : null}
        {shouldRenderProfileMenu ? (
          <KangurProfileMenu
            isTransitionActive={isTransitionSourceActive({
              activeTransitionSourceId,
              transitionPhase,
              transitionSourceId: profileTransitionSourceId,
            })}
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
  const mobileNav = (
    <KangurTopNavGroup label={navigationLabel}>
      <div className='flex w-full items-center justify-center'>
        <KangurButton
          aria-label={mobileMenuLabel}
          aria-controls={mobileMenuId}
          aria-expanded={isMobileMenuOpen}
          data-testid='kangur-primary-nav-mobile-toggle'
          onClick={toggleMobileMenu}
          size='md'
          type='button'
          variant='navigation'
        >
          {isMobileMenuOpen ? <X className={ICON_CLASSNAME} /> : <Menu className={ICON_CLASSNAME} />}
          <span className='sr-only'>{mobileMenuLabel}</span>
        </KangurButton>
      </div>
    </KangurTopNavGroup>
  );
  const desktopNav = (
    <KangurTopNavGroup label={navigationLabel}>
      {renderPrimaryActions()}
      {renderUtilityActions()}
    </KangurTopNavGroup>
  );
  const leftContent = isMobile ? mobileNav : desktopNav;
  const mobileMenuOverlay = isMobile ? (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isMobileMenuOpen}
    >
      <div
        className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.4)_0%,rgba(15,23,42,0.72)_100%)]'
        onClick={closeMobileMenu}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-label='Menu'
        id={mobileMenuId}
        className={`relative flex h-full w-full flex-col kangur-panel-gap overflow-y-auto px-5 pb-8 pt-[calc(env(safe-area-inset-top)+20px)] transition-transform duration-200 ${
          isMobileMenuOpen ? 'translate-y-0' : 'translate-y-4'
        }`}
        style={{ backgroundColor: kangurAppearance.tone.background, color: kangurAppearance.tone.text }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-center justify-between'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.32em] [color:var(--kangur-page-muted-text)]'>
            Menu
          </div>
          <KangurButton
            aria-label='Zamknij menu'
            onClick={closeMobileMenu}
            size='md'
            type='button'
            variant='navigation'
          >
            <X className={ICON_CLASSNAME} />
            <span className='sr-only'>Zamknij menu</span>
          </KangurButton>
        </div>
        <KangurTopNavGroup label={navigationLabel} className='w-full flex-col'>
          {renderPrimaryActions({
            onActionClick: closeMobileMenu,
            wrapperClassName: 'flex w-full flex-col gap-2',
            inlineAppearanceWithTutor: true,
          })}
          {renderUtilityActions({
            onActionClick: closeMobileMenu,
            wrapperClassName: 'flex w-full flex-col gap-2',
            hideAppearanceControls: true,
          })}
        </KangurTopNavGroup>
      </div>
    </div>
  ) : null;

  return (
    <>
      <KangurPageTopBar
        className={topBarClassName}
        contentClassName={topBarContentClassName}
        left={leftContent}
      />
      {mobileMenuOverlay}
    </>
  );
}
