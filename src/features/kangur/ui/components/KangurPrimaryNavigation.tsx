'use client';

import { BookOpen, BrainCircuit, LayoutGrid, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTextField,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';

type KangurPrimaryNavigationPage =
  | 'Game'
  | 'Lessons'
  | 'LearnerProfile'
  | 'ParentDashboard';

type NavActionProps = {
  active?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
  docId: string;
  elementRef?: React.Ref<HTMLButtonElement>;
  href?: string;
  onClick?: () => void;
  targetPageKey?: KangurPrimaryNavigationPage;
  testId?: string;
  title?: string;
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

const NavAction = ({
  active = false,
  ariaLabel,
  children,
  className,
  docId,
  elementRef,
  href,
  onClick,
  targetPageKey,
  testId,
  title,
}: NavActionProps): React.JSX.Element => {
  const variant = active ? 'navigationActive' : 'navigation';

  if (href) {
    return (
      <KangurButton
        asChild
        aria-current={active ? 'page' : undefined}
        aria-label={ariaLabel}
        className={className}
        data-doc-id={docId}
        data-testid={testId}
        size='md'
        title={title}
        variant={variant}
      >
        <Link href={href} targetPageKey={targetPageKey}>
          {children}
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
      data-testid={testId}
      onClick={onClick}
      ref={elementRef}
      size='md'
      title={title}
      type='button'
      variant={variant}
    >
      {children}
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
  const tutor = useOptionalKangurAiTutor();
  const auth = useOptionalKangurAuth();
  const effectiveIsAuthenticated = auth?.isAuthenticated ?? isAuthenticated;
  const effectiveCanManageLearners = auth?.user
    ? Boolean(auth.user.canManageLearners)
    : canManageLearners;
  const effectiveShowParentDashboard = effectiveCanManageLearners && showParentDashboard;
  const mobileAuthActionClassName = 'max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center';
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
      onGuestPlayerNameChange(trimmedValue);
    }
    setIsEditingGuestPlayerName(false);
  };

  const authAction = effectiveIsAuthenticated ? (
    <NavAction docId='profile_logout' onClick={onLogout}>
      <LogOut className={ICON_CLASSNAME} strokeWidth={2.15} />
      <span>Wyloguj</span>
    </NavAction>
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
              onChange={(event) => onGuestPlayerNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitGuestPlayerName();
                }
              }}
              placeholder={guestPlayerNamePlaceholder}
              size='md'
              type='text'
              value={guestPlayerName}
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
        <NavAction
          className={mobileAuthActionClassName}
          docId='profile_create_account'
          elementRef={createAccountActionRef}
          onClick={onCreateAccount}
          testId='kangur-primary-nav-create-account'
        >
          <UserPlus className={ICON_CLASSNAME} strokeWidth={2.15} />
          <span>Utwórz konto</span>
        </NavAction>
      ) : null}
      {onLogin ? (
        <NavAction
          className={mobileAuthActionClassName}
          docId='profile_login'
          elementRef={loginActionRef}
          onClick={onLogin}
          testId='kangur-primary-nav-login'
        >
          <LogIn className={ICON_CLASSNAME} strokeWidth={2.15} />
          <span>Zaloguj się</span>
        </NavAction>
      ) : null}
    </>
  ) : null;
  const tutorRestoreAction =
    isTutorHidden && !isTutorExplicitlyDisabled ? (
      <NavAction
        ariaLabel='Włącz AI Tutora'
        className='border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.94)_100%)] px-4 text-amber-700 shadow-[0_14px_24px_-18px_rgba(245,158,11,0.55)] ring-1 ring-amber-100/90 hover:border-amber-200 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(254,243,199,0.96)_100%)] hover:text-amber-800'
        docId='kangur-ai-tutor-restore'
        onClick={(): void => {
          persistTutorVisibilityHidden(false);
          if (tutor?.enabled) {
            tutor.openChat();
          }
        }}
        testId='kangur-ai-tutor-restore'
        title='Włącz AI Tutora'
      >
        <BrainCircuit className={ICON_CLASSNAME} strokeWidth={2.15} />
        <span>Włącz AI Tutora</span>
      </NavAction>
    ) : null;
  const utilityActions =
    rightAccessory || authAction ? (
      <div className='flex w-full flex-wrap items-center justify-stretch gap-2 sm:w-auto sm:justify-end'>
        {rightAccessory}
        {authAction}
      </div>
    ) : null;

  return (
    <KangurPageTopBar
      className={className}
      contentClassName={contentClassName}
      left={
        <KangurTopNavGroup label={navLabel}>
          <NavAction
            active={homeActive}
            className='px-3 sm:px-4'
            docId='top_nav_home'
            href={onHomeClick ? undefined : getKangurHomeHref(basePath)}
            onClick={onHomeClick}
            targetPageKey='Game'
            testId='kangur-primary-nav-home'
          >
            <span
              className='flex items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none'
              data-testid='kangur-home-logo'
            >
              <KangurHomeLogo />
            </span>
            <span className='sr-only'>Strona glowna</span>
          </NavAction>

          <NavAction
            active={currentPage === 'Lessons'}
            docId='top_nav_lessons'
            href={createPageUrl('Lessons', basePath)}
            targetPageKey='Lessons'
            testId='kangur-primary-nav-lessons'
          >
            <BookOpen className={ICON_CLASSNAME} strokeWidth={2.15} />
            <span>Lekcje</span>
          </NavAction>
          {tutorRestoreAction}
          {effectiveIsAuthenticated ? (
            <KangurProfileMenu
              basePath={basePath}
              isActive={currentPage === 'LearnerProfile'}
            />
          ) : null}

          {effectiveShowParentDashboard ? (
            <NavAction
              active={currentPage === 'ParentDashboard'}
              docId='top_nav_parent_dashboard'
              href={createPageUrl('ParentDashboard', basePath)}
              targetPageKey='ParentDashboard'
              testId='kangur-primary-nav-parent-dashboard'
            >
              <LayoutGrid className={ICON_CLASSNAME} strokeWidth={2.15} />
              <span>Rodzic</span>
            </NavAction>
          ) : null}
        </KangurTopNavGroup>
      }
      right={utilityActions}
    />
  );
}
