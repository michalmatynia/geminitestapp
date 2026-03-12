'use client';

import { BookOpen, BrainCircuit, LayoutGrid, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  CmsStorefrontAppearanceButtons,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import {
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
  | 'ParentDashboard';

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
  navLabel = 'Glowna nawigacja Kangur',
  onCreateAccount,
  onGuestPlayerNameChange,
  onHomeClick,
  onLogin,
  onLogout,
  rightAccessory,
  showParentDashboard = canManageLearners,
}: KangurPrimaryNavigationProps): React.JSX.Element {
  const storefrontAppearance = useOptionalCmsStorefrontAppearance();
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const auth = useOptionalKangurAuth();
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
  const mobileAuthActionClassName =
    'max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center max-sm:px-3';
  const { entry: createAccountActionContent } = useKangurPageContentEntry(
    'shared-nav-create-account-action'
  );
  const { entry: loginActionContent } = useKangurPageContentEntry('shared-nav-login-action');
  const createAccountActionRef = useRef<HTMLButtonElement | null>(null);
  const loginActionRef = useRef<HTMLButtonElement | null>(null);
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());
  const isTutorExplicitlyDisabled = tutor?.tutorSettings?.enabled === false;
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
  const parentDashboardHref = createPageUrl('ParentDashboard', basePath);
  const profileHref = createPageUrl('LearnerProfile', basePath);
  const transitionPhase = routeTransitionState?.transitionPhase ?? 'idle';
  const activeTransitionSourceId = routeTransitionState?.activeTransitionSourceId ?? null;
  const homeTransitionSourceId = 'kangur-primary-nav:home';
  const lessonsTransitionSourceId = 'kangur-primary-nav:lessons';
  const profileTransitionSourceId = 'kangur-primary-nav:profile';
  const parentDashboardTransitionSourceId = 'kangur-primary-nav:parent-dashboard';
  const kangurAppearance = useKangurStorefrontAppearance();

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

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
        <span>Wyloguj</span>
      </>
    ),
    docId: 'profile_logout',
    onClick: onLogout,
    testId: 'kangur-primary-nav-logout',
  };
  const authAction = effectiveIsAuthenticated ? (
    renderNavAction(logoutAction)
  ) : onLogin || onCreateAccount ? (
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
        renderNavAction({
          className: mobileAuthActionClassName,
          content: (
            <>
              <UserPlus className={ICON_CLASSNAME} strokeWidth={2.15} />
              <span>{createAccountActionContent?.title ?? 'Utwórz konto'}</span>
            </>
          ),
          docId: 'profile_create_account',
          elementRef: createAccountActionRef,
          onClick: onCreateAccount,
          testId: 'kangur-primary-nav-create-account',
          title: createAccountActionContent?.summary ?? undefined,
        })
      ) : null}
      {onLogin ? (
        renderNavAction({
          className: mobileAuthActionClassName,
          content: (
            <>
              <LogIn className={ICON_CLASSNAME} strokeWidth={2.15} />
              <span>{loginActionContent?.title ?? 'Zaloguj się'}</span>
            </>
          ),
          docId: 'profile_login',
          elementRef: loginActionRef,
          onClick: onLogin,
          testId: 'kangur-primary-nav-login',
          title: loginActionContent?.summary ?? undefined,
        })
      ) : null}
    </>
  ) : null;
  const tutorRestoreAction =
    isTutorHidden ? (
      renderNavAction({
        ariaLabel: tutorContent.navigation.restoreTutorLabel,
        className:
          'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800',
        content: (
          <>
            <BrainCircuit className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span>{tutorContent.navigation.restoreTutorLabel}</span>
          </>
        ),
        docId: 'kangur-ai-tutor-restore',
        onClick: (): void => {
          persistTutorVisibilityHidden(false);
          if (tutor?.enabled) {
            tutor.openChat();
          }
        },
        testId: 'kangur-ai-tutor-restore',
        title: isTutorExplicitlyDisabled
          ? tutorContent.navigation.restoreTutorLabel
          : tutorContent.navigation.restoreTutorLabel,
      })
    ) : null;
  const homeAction: KangurNavActionConfig = {
    active: homeActive,
    className: 'px-3 sm:px-4',
    content: (
      <>
        <span
          className='flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none'
          data-testid='kangur-home-logo'
        >
          <KangurHomeLogo idPrefix='kangur-primary-nav-logo' />
        </span>
        <span className='sr-only'>Strona glowna</span>
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
    className: 'max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center',
    content: (
      <>
        <BookOpen className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span>Lekcje</span>
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
  const parentDashboardAction: KangurNavActionConfig | null = effectiveShowParentDashboard
    ? {
      active: currentPage === 'ParentDashboard',
      content: (
        <>
          <LayoutGrid className={ICON_CLASSNAME} strokeWidth={2.15} />
          <span>Rodzic</span>
        </>
      ),
      docId: 'top_nav_parent_dashboard',
      href: parentDashboardHref,
      targetPageKey: 'ParentDashboard',
      className: 'max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center max-sm:px-3',
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
  const appearanceControls = storefrontAppearance ? (
    <CmsStorefrontAppearanceButtons
      tone={kangurAppearance.tone}
      label='Kangur appearance'
      testId='kangur-primary-nav-appearance-controls'
    />
  ) : null;
  const primaryActions = (
    <div
      className='flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap'
      data-testid='kangur-primary-nav-primary-actions'
    >
      {renderNavAction(homeAction)}
      {renderNavAction(lessonsAction)}
      {tutorRestoreAction}
      {effectiveIsAuthenticated ? (
        <KangurProfileMenu
          isTransitionActive={isTransitionSourceActive({
            activeTransitionSourceId,
            transitionPhase,
            transitionSourceId: profileTransitionSourceId,
          })}
          profile={{ href: profileHref, isActive: learnerProfileIsActive }}
          transitionAcknowledgeMs={NAVIGATION_TRANSITION_ACKNOWLEDGE_MS}
          transitionSourceId={profileTransitionSourceId}
          triggerClassName='max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center'
        />
      ) : null}
    </div>
  );
  const utilityActions =
    appearanceControls || rightAccessory || parentDashboardAction || authAction ? (
      <div
        className='ml-auto flex w-full flex-wrap items-center justify-end gap-2 max-sm:ml-0 max-sm:justify-start sm:w-auto'
        data-testid='kangur-primary-nav-utility-actions'
      >
        {appearanceControls}
        {rightAccessory}
        {parentDashboardAction ? renderNavAction(parentDashboardAction) : null}
        {authAction}
      </div>
    ) : null;
  const leftContent = (
    <KangurTopNavGroup label={navigationLabel}>
      {primaryActions}
      {utilityActions}
    </KangurTopNavGroup>
  );

  return (
    <KangurPageTopBar
      className={topBarClassName}
      contentClassName={topBarContentClassName}
      left={leftContent}
    />
  );
}
