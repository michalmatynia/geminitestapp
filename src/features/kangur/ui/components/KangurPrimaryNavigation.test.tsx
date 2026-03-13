/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { startRouteTransitionMock } = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
}));

const { optionalAuthMock } = vi.hoisted(() => ({
  optionalAuthMock: vi.fn(),
}));

const { optionalTutorMock } = vi.hoisted(() => ({
  optionalTutorMock: vi.fn(),
}));

const { useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurPageContentEntryMock: vi.fn(),
}));

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

const { settingsStoreGetMock } = vi.hoisted(() => ({
  settingsStoreGetMock: vi.fn<(key: string) => string | undefined>(),
}));

const { updateSettingMutateAsyncMock } = vi.hoisted(() => ({
  updateSettingMutateAsyncMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
}));

vi.mock('framer-motion', () => {
  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }): React.JSX.Element {
      return React.createElement(tag, props, children);
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      button: createMotionTag('button'),
      div: createMotionTag('div'),
    },
  };
});

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionActions: () => ({
    startRouteTransition: startRouteTransitionMock,
  }),
  useOptionalKangurRouteTransitionState: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: () => optionalAuthMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useOptionalKangurAiTutor: () => optionalTutorMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/providers/SettingsStoreProvider')>();
  return {
    ...actual,
    useSettingsStore: () => ({
      get: settingsStoreGetMock,
    }),
  };
});

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    isPending: false,
    mutateAsync: updateSettingMutateAsyncMock,
  }),
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    ariaLabel,
    disabled,
    onValueChange,
    options,
    value,
  }: {
    ariaLabel?: string;
    disabled?: boolean;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      data-testid='mock-select-simple'
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_THEME_SETTINGS_KEY,
} from '@/features/kangur/theme-settings';
import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import {
  loadPersistedTutorVisibilityHidden,
  persistTutorVisibilityHidden,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';

describe('KangurPrimaryNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    optionalAuthMock.mockReturnValue(null);
    optionalTutorMock.mockReturnValue(null);
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    settingsStoreGetMock.mockReset();
    settingsStoreGetMock.mockReturnValue(undefined);
    updateSettingMutateAsyncMock.mockReset();
    updateSettingMutateAsyncMock.mockResolvedValue({
      key: KANGUR_DAILY_THEME_SETTINGS_KEY,
      value: 'default',
    });
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
    window.sessionStorage.clear();
  });

  it('renders the SVG logo inside the home control', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        contentClassName='justify-center'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const logo = screen.getByTestId('kangur-home-logo');

    expect(logo.querySelector('svg')).not.toBeNull();
    expect(logo.className).not.toContain('translate-x-');
    expect(screen.getByRole('link', { name: /strona główna/i })).toHaveAttribute(
      'href',
      '/kangur'
    );
  });

  it('navigates to the learner profile directly from the profile item', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /profil/i })).toHaveAttribute(
      'href',
      '/kangur/profile'
    );
  });

  it('starts the Kangur route transition before navigating to another page', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /lekcje/i }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 110,
      href: '/kangur/lessons',
      pageKey: 'Lessons',
      sourceId: 'kangur-primary-nav:lessons',
    });
  });

  it('uses the canonical Kangur home route when returning from another page', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /strona główna/i }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 110,
      href: '/kangur',
      pageKey: 'Game',
      sourceId: 'kangur-primary-nav:home',
    });
  });

  it('starts the managed handoff when opening the learner profile from the navbar', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /profil/i }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 110,
      href: '/kangur/profile',
      pageKey: 'LearnerProfile',
      sourceId: 'kangur-primary-nav:profile',
    });
  });

  it('renders the toolbar nav group at full width', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-page-top-bar')).toHaveClass('sticky', 'top-0', 'w-full');
    expect(screen.getByRole('navigation', { name: /główna nawigacja kangur/i })).toHaveClass(
      'kangur-nav-group',
      'w-full',
      'p-2'
    );
  });

  it('shows logout as a separate action and calls the logout handler', () => {
    const onLogout = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /wyloguj/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders storefront appearance controls inside the Kangur navbar and updates the mode', () => {
    render(
      <CmsStorefrontAppearanceProvider initialMode='default'>
        <KangurPrimaryNavigation
          basePath='/kangur'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </CmsStorefrontAppearanceProvider>
    );

    const utilityActions = screen.getByTestId('kangur-primary-nav-utility-actions');
    const themeToggleButton = screen.getByRole('button', { name: 'Switch to Dawn theme' });

    expect(utilityActions).toContainElement(
      screen.getByTestId('kangur-primary-nav-appearance-controls')
    );

    fireEvent.click(themeToggleButton);

    expect(screen.getByRole('button', { name: 'Switch to Sunset theme' })).toBeInTheDocument();
  });

  it('does not show the theme selector for non-elevated users', () => {    sessionMock.mockReturnValue({
      data: {
        user: {
          id: 'session-user-2',
          isElevated: false,
          permissions: [],
          role: 'user',
        },
      },
      status: 'authenticated',
    });

    render(
      <CmsStorefrontAppearanceProvider initialMode='default'>
        <KangurPrimaryNavigation
          basePath='/kangur'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </CmsStorefrontAppearanceProvider>
    );

    expect(
      screen.queryByTestId('kangur-primary-nav-default-appearance-controls')
    ).toBeNull();
  });

  it('keeps the parent dashboard and logout actions inside the navbar and aligned right', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        canManageLearners
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const utilityActions = screen.getByTestId('kangur-primary-nav-utility-actions');
    const nav = screen.getByRole('navigation', { name: /główna nawigacja kangur/i });

    expect(utilityActions).toHaveClass('ml-auto', 'justify-end');
    expect(nav).toContainElement(utilityActions);
    expect(utilityActions).toContainElement(
      screen.getByTestId('kangur-primary-nav-parent-dashboard')
    );
    expect(utilityActions).toContainElement(screen.getByTestId('kangur-primary-nav-logout'));
    expect(nav).toContainElement(screen.getByTestId('kangur-primary-nav-parent-dashboard'));
  });

  it('does not split the parent dashboard and logout actions into a separate top-bar cluster', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        canManageLearners
        currentPage='ParentDashboard'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByTestId('kangur-page-top-bar-right')).toBeNull();
    expect(screen.getByRole('navigation', { name: /główna nawigacja kangur/i })).toContainElement(
      screen.getByTestId('kangur-primary-nav-utility-actions')
    );
  });

  it('shows login and create-account actions when the user is not authenticated', () => {
    const onLogin = vi.fn();
    const onCreateAccount = vi.fn();
    const onGuestPlayerNameChange = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        guestPlayerName='Ala'
        isAuthenticated={false}
        onCreateAccount={onCreateAccount}
        onGuestPlayerNameChange={onGuestPlayerNameChange}
        onLogin={onLogin}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Ala' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ala' }));
    fireEvent.change(screen.getByPlaceholderText('Wpisz imię gracza...'), {
      target: { value: 'Ola' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Wpisz imię gracza...'), {
      key: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto' }));
    fireEvent.click(screen.getByRole('button', { name: /zaloguj się/i }));

    expect(onGuestPlayerNameChange).toHaveBeenCalledWith('Ola');
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Ala' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /profil/i })).toBeNull();
  });

  it('registers tutor anchors on the anonymous auth actions', () => {
    render(
      <KangurTutorAnchorProvider>
        <KangurPrimaryNavigation
          basePath='/kangur'
          currentPage='Game'
          guestPlayerName='Ala'
          isAuthenticated={false}
          onCreateAccount={vi.fn()}
          onGuestPlayerNameChange={vi.fn()}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
        />
      </KangurTutorAnchorProvider>
    );

    expect(screen.getByTestId('kangur-primary-nav-login')).toHaveAttribute(
      'data-kangur-tutor-anchor-kind',
      'login_action'
    );
    expect(screen.getByTestId('kangur-primary-nav-create-account')).toHaveAttribute(
      'data-kangur-tutor-anchor-kind',
      'create_account_action'
    );
    expect(screen.getByTestId('kangur-primary-nav-login')).toHaveAttribute(
      'data-kangur-tutor-anchor-surface',
      'auth'
    );
  });

  it('uses Mongo-backed labels on the anonymous auth actions when available', () => {
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => ({
      data: undefined,
      entry:
        entryId === 'shared-nav-create-account-action'
          ? {
              id: 'shared-nav-create-account-action',
              title: 'Utwórz konto',
              summary: 'Załóż konto rodzica bez opuszczania tej strony.',
            }
          : {
              id: 'shared-nav-login-action',
              title: 'Zaloguj się',
              summary: 'Otwórz logowanie rodzica lub ucznia z bieżącej strony.',
            },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    }));

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        guestPlayerName='Ala'
        isAuthenticated={false}
        onCreateAccount={vi.fn()}
        onGuestPlayerNameChange={vi.fn()}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Utwórz konto' })).toHaveAttribute(
      'title',
      'Załóż konto rodzica bez opuszczania tej strony.'
    );
    expect(screen.getByRole('button', { name: 'Zaloguj się' })).toHaveAttribute(
      'title',
      'Otwórz logowanie rodzica lub ucznia z bieżącej strony.'
    );
  });

  it('shows a visible restore action when the tutor was hidden locally and reopens it on click', () => {
    const openChatMock = vi.fn();
    optionalTutorMock.mockReturnValue({
      enabled: true,
      openChat: openChatMock,
    });
    persistTutorVisibilityHidden(true);

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const restoreButton = screen.getByTestId('kangur-ai-tutor-restore');

    expect(restoreButton).toBeVisible();
    expect(restoreButton).toHaveTextContent('Włącz AI Tutora');
    expect(restoreButton.className).toContain('bg-[linear-gradient');

    fireEvent.click(restoreButton);

    expect(openChatMock).toHaveBeenCalledTimes(1);
    expect(loadPersistedTutorVisibilityHidden()).toBe(false);
  });

  it('still shows the restore action when the current tutor surface is unavailable but tutoring is not globally disabled', () => {
    optionalTutorMock.mockReturnValue({
      enabled: false,
      openChat: vi.fn(),
      tutorSettings: {
        enabled: true,
      },
    });
    persistTutorVisibilityHidden(true);

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        contentClassName='justify-center'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-ai-tutor-restore')).toBeVisible();
  });

  it('renders the restore action inside the main nav group when the tutor is hidden locally', () => {
    optionalTutorMock.mockReturnValue({
      enabled: true,
      openChat: vi.fn(),
      tutorSettings: {
        enabled: true,
      },
    });
    persistTutorVisibilityHidden(true);

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        contentClassName='justify-center'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('navigation', { name: /główna nawigacja kangur/i })).toContainElement(
      screen.getByTestId('kangur-ai-tutor-restore')
    );
  });

  it('collapses the guest name input on blur and reopens it on click', () => {
    const onGuestPlayerNameChange = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        guestPlayerName='Ola'
        isAuthenticated={false}
        onCreateAccount={vi.fn()}
        onGuestPlayerNameChange={onGuestPlayerNameChange}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ola' }));
    fireEvent.blur(screen.getByPlaceholderText('Wpisz imię gracza...'));

    expect(screen.getByRole('button', { name: 'Ola' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ola' }));

    expect(screen.getByPlaceholderText('Wpisz imię gracza...')).toBeInTheDocument();
  });

  it('hides the parent dashboard link when auth resolves a student session', () => {
    optionalAuthMock.mockReturnValue({
      authError: null,
      appPublicSettings: null,
      canAccessParentAssignments: true,
      checkAppState: vi.fn(),
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      selectLearner: vi.fn(),
      user: {
        activeLearner: {
          createdAt: '2026-03-08T10:00:00.000Z',
          displayName: 'Ola',
          id: 'learner-1',
          loginName: 'ola',
          ownerUserId: 'parent-1',
          status: 'active',
          updatedAt: '2026-03-08T10:00:00.000Z',
        },
        actorType: 'learner',
        canManageLearners: false,
        email: null,
        full_name: 'Ola',
        id: 'learner-1',
        learners: [],
        ownerUserId: 'parent-1',
        role: 'user',
      },
    });

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        canManageLearners
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByTestId('kangur-primary-nav-parent-dashboard')).toBeNull();
    expect(screen.getByRole('link', { name: /profil/i })).toBeInTheDocument();
  });
});
