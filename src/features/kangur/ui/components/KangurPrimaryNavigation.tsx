'use client';

import { useEffect, useState } from 'react';

import { BookOpen, LayoutGrid, LogIn, LogOut, UserPlus } from 'lucide-react';

import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurHomeLogo } from '@/features/kangur/ui/components/KangurHomeLogo';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurPageTopBar,
  KangurTextField,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';

type KangurPrimaryNavigationPage =
  | 'Game'
  | 'Lessons'
  | 'LearnerProfile'
  | 'ParentDashboard';

type NavActionProps = {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  docId: string;
  href?: string;
  onClick?: () => void;
  targetPageKey?: KangurPrimaryNavigationPage;
  testId?: string;
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
  children,
  className,
  docId,
  href,
  onClick,
  targetPageKey,
  testId,
}: NavActionProps): React.JSX.Element => {
  const variant = active ? 'navigationActive' : 'navigation';

  if (href) {
    return (
      <KangurButton
        asChild
        aria-current={active ? 'page' : undefined}
        className={className}
        data-doc-id={docId}
        data-testid={testId}
        size='md'
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
      className={className}
      data-doc-id={docId}
      data-testid={testId}
      onClick={onClick}
      size='md'
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
  guestPlayerNamePlaceholder = 'Wpisz imie gracza...',
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
  const auth = useOptionalKangurAuth();
  const effectiveIsAuthenticated = auth?.isAuthenticated ?? isAuthenticated;
  const effectiveCanManageLearners = auth?.user
    ? Boolean(auth.user.canManageLearners)
    : canManageLearners;
  const effectiveShowParentDashboard = effectiveCanManageLearners && showParentDashboard;
  const mobileAuthActionClassName = 'max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center';
  const [isEditingGuestPlayerName, setIsEditingGuestPlayerName] = useState(
    !(guestPlayerName?.trim() ?? '')
  );
  const showGuestPlayerNameInput =
    !effectiveIsAuthenticated &&
    typeof guestPlayerName === 'string' &&
    typeof onGuestPlayerNameChange === 'function';
  const hasGuestPlayerName = (guestPlayerName?.trim() ?? '').length > 0;

  useEffect(() => {
    if (!showGuestPlayerNameInput) {
      setIsEditingGuestPlayerName(false);
      return;
    }

    if (!hasGuestPlayerName) {
      setIsEditingGuestPlayerName(true);
    }
  }, [hasGuestPlayerName, showGuestPlayerNameInput]);

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
              Imie gracza
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
          onClick={onCreateAccount}
          testId='kangur-primary-nav-create-account'
        >
          <UserPlus className={ICON_CLASSNAME} strokeWidth={2.15} />
          <span>Utworz konto</span>
        </NavAction>
      ) : null}
      {onLogin ? (
        <NavAction
          className={mobileAuthActionClassName}
          docId='profile_login'
          onClick={onLogin}
        >
          <LogIn className={ICON_CLASSNAME} strokeWidth={2.15} />
          <span>Zaloguj się</span>
        </NavAction>
      ) : null}
    </>
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

          {rightAccessory || authAction ? (
            <div className='ml-auto flex w-full flex-wrap items-center justify-stretch gap-2 sm:w-auto sm:justify-end'>
          {rightAccessory}
          {authAction}
        </div>
      ) : null}
    </KangurTopNavGroup>
      }
    />
  );
}
