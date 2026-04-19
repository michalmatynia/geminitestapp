
/**
 * @vitest-environment jsdom
 */

import { QueryClientContext } from '@tanstack/react-query';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CmsStorefrontAppearanceProvider,
  KangurPrimaryNavigation,
  KangurTutorAnchorProvider,
  ageGroupState,
  frontendPublicOwnerMock,
  localeMock,
  locationAssignSpy,
  openLanguageMenu,
  optionalAuthMock,
  optionalRoutingMock,
  optionalTutorMock,
  pathnameMock,
  persistTutorVisibilityHidden,
  prefetchKangurLessonsCatalogMock,
  prefetchKangurPageContentStoreMock,
  prefetchMock,
  pushMock,
  replaceMock,
  routeTransitionStateMock,
  searchParamsMock,
  sessionMock,
  setViewport,
  settingsStoreGetMock,
  setupKangurPrimaryNavigationTest,
  startRouteTransitionMock,
  translationMessages,
  updateSettingMutateAsyncMock,
  useKangurCoarsePointerMock,
  useKangurIdleReadyMock,
  useKangurPageContentEntryMock,
  useKangurSubjectFocusMock,
} from '../KangurPrimaryNavigation.test-support';

describe('KangurPrimaryNavigation', () => {
  setupKangurPrimaryNavigationTest();

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

it('hides the profile link for parent accounts without an active learner', () => {
  optionalAuthMock.mockReturnValue({
    authError: null,
    appPublicSettings: null,
    canAccessParentAssignments: false,
    checkAppState: vi.fn(),
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    logout: vi.fn(),
    navigateToLogin: vi.fn(),
    selectLearner: vi.fn(),
    user: {
      activeLearner: null,
      actorType: 'parent',
      canManageLearners: true,
      email: 'parent@example.com',
      full_name: 'Rodzic',
      id: 'parent-1',
      learners: [],
      ownerUserId: 'parent-1',
      ownerEmailVerified: true,
      role: 'user',
    },
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.queryByRole('link', { name: /profil/i })).toBeNull();
});

it('shows the active learner name in the profile label for parent accounts', async () => {
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
        displayName: 'Maja',
        id: 'learner-2',
        loginName: 'maja',
        ownerUserId: 'parent-1',
        status: 'active',
        updatedAt: '2026-03-08T10:00:00.000Z',
      },
      actorType: 'parent',
      canManageLearners: true,
      email: 'parent@example.com',
      full_name: 'Rodzic',
      id: 'parent-1',
      learners: [],
      ownerUserId: 'parent-1',
      ownerEmailVerified: true,
      role: 'user',
    },
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(await screen.findByRole('link', { name: 'Profil Maja' })).toHaveAttribute(
    'href',
    '/kangur/profile'
  );
});

it('shows the login action and hides create-account when the user is not authenticated', () => {
  const onLogin = vi.fn();
  const onGuestPlayerNameChange = vi.fn();

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      guestPlayerName='Ala'
      isAuthenticated={false}
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
  fireEvent.click(screen.getByRole('button', { name: /zaloguj się/i }));

  expect(onGuestPlayerNameChange).toHaveBeenCalledWith('Ola');
  expect(screen.queryByRole('button', { name: 'Utwórz konto' })).toBeNull();
  expect(onLogin).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Ala' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /profil/i })).toBeNull();
});

it('does not render a separate guest-name submit button while editing', () => {
  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      guestPlayerName=''
      isAuthenticated={false}
      onGuestPlayerNameChange={vi.fn()}
      onLogin={vi.fn()}
      onLogout={vi.fn()}
    />
  );

  expect(screen.getByPlaceholderText('Wpisz imię gracza...')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Imię gracza' })).toBeNull();
});

it('registers tutor anchors on the anonymous login action only', () => {
  render(
    <KangurTutorAnchorProvider>
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        guestPlayerName='Ala'
        isAuthenticated={false}
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
  expect(screen.queryByTestId('kangur-primary-nav-create-account')).toBeNull();
  expect(screen.getByTestId('kangur-primary-nav-login')).toHaveAttribute(
    'data-kangur-tutor-anchor-surface',
    'auth'
  );
});

it('uses Mongo-backed labels on the anonymous login action when available', () => {
  useKangurPageContentEntryMock.mockImplementation(() => ({
    data: undefined,
    entry: {
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
      onGuestPlayerNameChange={vi.fn()}
      onLogin={vi.fn()}
      onLogout={vi.fn()}
    />
  );

  expect(screen.queryByRole('button', { name: 'Utwórz konto' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Zaloguj się' })).toHaveAttribute(
    'title',
    'Otwórz logowanie rodzica lub ucznia z bieżącej strony.'
  );
});

it('does not mount the login page-content hook on authenticated routes', () => {
  useKangurPageContentEntryMock.mockClear();

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(useKangurPageContentEntryMock).not.toHaveBeenCalled();
});

it('keeps the anonymous login action on fallback copy until the standalone home utility gate opens', () => {
  useKangurIdleReadyMock.mockReturnValue(false);
  optionalRoutingMock.mockReturnValue({
    basePath: '/kangur',
    embedded: false,
    pageKey: 'Game',
    requestedHref: '/kangur',
    requestedPath: '/kangur',
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      guestPlayerName='Ala'
      isAuthenticated={false}
      onGuestPlayerNameChange={vi.fn()}
      onLogin={vi.fn()}
      onLogout={vi.fn()}
    />
  );

  expect(useKangurPageContentEntryMock).toHaveBeenCalledWith(
    'shared-nav-login-action',
    undefined,
    { enabled: false }
  );
  expect(screen.getByRole('button', { name: 'Zaloguj się' })).toBeInTheDocument();
});

it('keeps the learner profile menu off the standalone home utility path until the gate opens', () => {
  useKangurIdleReadyMock.mockReturnValue(false);
  optionalRoutingMock.mockReturnValue({
    basePath: '/kangur',
    embedded: false,
    pageKey: 'Game',
    requestedHref: '/kangur',
    requestedPath: '/kangur',
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.queryByRole('link', { name: /profil/i })).toBeNull();
  expect(screen.getByRole('button', { name: /wyloguj/i })).toBeInTheDocument();
});

it('keeps the elevated user menu off the standalone home utility path until the gate opens', () => {
  useKangurIdleReadyMock.mockReturnValue(false);
  optionalRoutingMock.mockReturnValue({
    basePath: '/kangur',
    embedded: false,
    pageKey: 'Game',
    requestedHref: '/kangur',
    requestedPath: '/kangur',
  });
  optionalAuthMock.mockReturnValue({
    authError: null,
    appPublicSettings: null,
    canAccessParentAssignments: false,
    checkAppState: vi.fn(),
    hasResolvedAuth: true,
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    isLoggingOut: false,
    logout: vi.fn(),
    navigateToLogin: vi.fn(),
    selectLearner: vi.fn(),
    user: {
      activeLearner: null,
      actorType: 'parent',
      canManageLearners: true,
      email: 'admin@example.com',
      full_name: 'Super Admin',
      id: 'admin-1',
      learners: [],
      role: 'admin',
    },
  });
  sessionMock.mockReturnValue({
    data: {
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'admin@example.com',
        id: 'admin-1',
        image: null,
        isElevated: true,
        name: 'Super Admin',
        role: 'super_admin',
      },
    },
    status: 'authenticated',
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.queryByTestId('kangur-elevated-user-menu-trigger')).toBeNull();
  expect(screen.getByRole('button', { name: /wyloguj/i })).toBeInTheDocument();
});

it('uses English fallback auth copy on the English route when CMS copy is unavailable', () => {
  localeMock.mockReturnValue('en');

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      guestPlayerName=''
      isAuthenticated={false}
      onGuestPlayerNameChange={vi.fn()}
      onLogin={vi.fn()}
      onLogout={vi.fn()}
    />
  );

  expect(screen.getByPlaceholderText('Enter the player name...')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Zaloguj się' })).toBeNull();
});

it('hides the toggle action in the primary nav when the tutor is hidden locally', () => {
  optionalTutorMock.mockReturnValue({
    enabled: true,
    openChat: vi.fn(),
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

  expect(screen.queryByTestId('kangur-ai-tutor-toggle')).toBeNull();
});

it('keeps the toggle action hidden even when the current tutor surface is unavailable', () => {
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

  expect(screen.queryByTestId('kangur-ai-tutor-toggle')).toBeNull();
});

it('does not render the toggle action inside the main nav group when the tutor is hidden locally', () => {
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

  expect(screen.queryByTestId('kangur-ai-tutor-toggle')).toBeNull();
});

it('collapses the guest name input on blur and reopens it on click', () => {
  const onGuestPlayerNameChange = vi.fn();

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      guestPlayerName='Ola'
      isAuthenticated={false}
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

it('hides the parent dashboard link when auth resolves a student session', async () => {
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
  expect(await screen.findByRole('link', { name: 'Profil Ola' })).toBeInTheDocument();
});

});
