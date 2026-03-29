
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
  useKangurPageContentEntryMock,
  useKangurSubjectFocusMock,
} from './KangurPrimaryNavigation.test-support';

describe('KangurPrimaryNavigation', () => {
  setupKangurPrimaryNavigationTest();

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

  const brand = screen.getByTestId('kangur-home-brand');
  const logo = screen.getByTestId('kangur-home-logo');
  const betaBadge = screen.getByTestId('kangur-home-beta-badge');

  expect(brand).toContainElement(logo);
  expect(brand).toContainElement(betaBadge);
  expect(logo.querySelector('svg')).not.toBeNull();
  expect(betaBadge.querySelector('title')?.textContent).toBe('StuqiQ Beta badge');
  expect(betaBadge.querySelector('text')?.textContent).toBe('BETA');
  expect(logo.className).not.toContain('translate-x-');
  expect(screen.getByRole('link', { name: /strona główna/i })).toHaveAttribute(
    'href',
    '/kangur'
  );
});

it('navigates to the learner profile directly from the profile item', async () => {
  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(await screen.findByRole('link', { name: /profil/i })).toHaveAttribute(
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
    href: '/kangur/lessons',
    pageKey: 'Lessons',
    sourceId: 'kangur-primary-nav:lessons',
  });
});

it('prefetches the lessons catalog on lessons-nav intent', () => {
  const queryClient = { prefetchQuery: vi.fn() };

  render(
    <QueryClientContext.Provider value={queryClient as never}>
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    </QueryClientContext.Provider>
  );

  const lessonsLink = screen.getByTestId('kangur-primary-nav-lessons');

  fireEvent.mouseEnter(lessonsLink);
  fireEvent.focus(lessonsLink);

  expect(prefetchKangurLessonsCatalogMock).toHaveBeenCalledTimes(1);
  expect(prefetchKangurLessonsCatalogMock).toHaveBeenCalledWith(queryClient, {
    ageGroup: 'ten_year_old',
    enabledOnly: true,
    subject: 'maths',
  });
});

it('does not prefetch the lessons catalog when lessons is already active', () => {
  const queryClient = { prefetchQuery: vi.fn() };

  render(
    <QueryClientContext.Provider value={queryClient as never}>
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    </QueryClientContext.Provider>
  );

  const lessonsLink = screen.getByTestId('kangur-primary-nav-lessons');

  fireEvent.mouseEnter(lessonsLink);
  fireEvent.focus(lessonsLink);

  expect(prefetchKangurLessonsCatalogMock).not.toHaveBeenCalled();
});

it('renders canonical localized nav links when Kangur owns the public frontend', async () => {
  frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/kangur');

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.queryByTestId('kangur-primary-nav-games-library')).toBeNull();
  expect(screen.getByTestId('kangur-primary-nav-lessons')).toHaveAttribute(
    'href',
    '/en/lessons'
  );
  expect(screen.getByTestId('kangur-primary-nav-duels')).toHaveAttribute(
    'href',
    '/en/duels'
  );
  expect(await screen.findByRole('link', { name: /profil/i })).toHaveAttribute(
    'href',
    '/en/profile'
  );

  fireEvent.click(screen.getByTestId('kangur-primary-nav-lessons'));

  expect(startRouteTransitionMock).toHaveBeenCalledWith({
    href: '/en/lessons',
    pageKey: 'Lessons',
    sourceId: 'kangur-primary-nav:lessons',
  });
});

it('shows the localized Games library link only for logged-in super admins', () => {
  frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/kangur');
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

  expect(screen.getByTestId('kangur-primary-nav-games-library')).toHaveAttribute(
    'href',
    '/en/games'
  );
});

it('hides the Games library link for authenticated non-super-admin users', () => {
  optionalAuthMock.mockReturnValue({
    authError: null,
    appPublicSettings: null,
    canAccessParentAssignments: true,
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
      email: 'parent@example.com',
      full_name: 'Parent User',
      id: 'parent-1',
      learners: [],
      role: 'parent',
    },
  });
  sessionMock.mockReturnValue({
    data: {
      expires: '2026-12-31T23:59:59.000Z',
      user: {
        email: 'parent@example.com',
        id: 'parent-1',
        image: null,
        name: 'Parent User',
        role: 'admin',
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

  expect(screen.queryByTestId('kangur-primary-nav-games-library')).toBeNull();
});

it('uses the canonical localized home route when Kangur owns the public frontend', () => {
  frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.getByTestId('kangur-primary-nav-home')).toHaveAttribute('href', '/en');

  fireEvent.click(screen.getByTestId('kangur-primary-nav-home'));

  expect(startRouteTransitionMock).toHaveBeenCalledWith({
    href: '/en',
    pageKey: 'Game',
    sourceId: 'kangur-primary-nav:home',
  });
});

it('uses the canonical localized profile route when Kangur owns the public frontend', async () => {
  frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
  localeMock.mockReturnValue('en');
  pathnameMock.mockReturnValue('/en/lessons');

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const profileLink = await screen.findByRole('link', { name: /profil/i });
  expect(profileLink).toHaveAttribute('href', '/en/profile');

  fireEvent.click(profileLink);

  expect(startRouteTransitionMock).toHaveBeenCalledWith({
    href: '/en/profile',
    pageKey: 'LearnerProfile',
    sourceId: 'kangur-primary-nav:profile',
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
    href: '/kangur',
    pageKey: 'Game',
    sourceId: 'kangur-primary-nav:home',
  });
});

it('starts the managed handoff when opening the learner profile from the navbar', async () => {
  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  fireEvent.click(await screen.findByRole('link', { name: /profil/i }));

  expect(startRouteTransitionMock).toHaveBeenCalledWith({
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
  expect(screen.getByTestId('kangur-page-top-bar')).not.toHaveAttribute('role');
  expect(screen.getByRole('navigation', { name: /główna nawigacja kangur/i })).toHaveClass(
    'kangur-nav-group',
    'w-full',
    'p-2'
  );
});

it('renders the mobile toggle immediately on small viewports', () => {
  setViewport({ width: 390, matches: true });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const mobileToggle = screen.getByTestId('kangur-primary-nav-mobile-toggle');

  expect(mobileToggle).toBeInTheDocument();
  expect(mobileToggle).toHaveAttribute('aria-controls', 'kangur-mobile-menu');
  expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');
  expect(mobileToggle).toHaveAttribute('aria-haspopup', 'dialog');
  expect(mobileToggle).not.toHaveClass('glass-panel');
  expect(screen.getByRole('navigation', { name: /główna nawigacja kangur/i })).toHaveClass('p-2');
  expect(screen.queryByRole('link', { name: /lekcje/i })).toBeNull();
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

it('fires logout on the first tap from the mobile menu', async () => {
  const onLogout = vi.fn();
  setViewport({ width: 390, matches: true });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={onLogout}
    />
  );

  fireEvent.click(screen.getByTestId('kangur-primary-nav-mobile-toggle'));
  expect(
    within(screen.getByTestId('kangur-primary-nav-mobile-header')).getByRole('button', {
      name: 'Zamknij menu',
    })
  ).toHaveClass(
    'touch-manipulation'
  );
  fireEvent.click(screen.getByRole('button', { name: /wyloguj/i }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});

it('shows the elevated avatar menu for super admins without an active learner', async () => {
  const onLogout = vi.fn();
  const user = userEvent.setup();

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
      currentPage='Lessons'
      isAuthenticated
      onLogout={onLogout}
    />
  );

  expect(
    await screen.findByTestId('kangur-elevated-user-menu-trigger')
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Wyloguj' })).toHaveAttribute(
    'data-testid',
    'kangur-primary-nav-logout'
  );
  expect(screen.queryByRole('link', { name: /profil super admin/i })).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Wyloguj' }));

  expect(onLogout).toHaveBeenCalledTimes(1);

  await user.click(screen.getByTestId('kangur-elevated-user-menu-trigger'));

  expect(screen.getByText('Super Admin')).toBeInTheDocument();
  expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin');
});

it('restores the direct learner profile link when an elevated admin has an active learner', async () => {
  optionalAuthMock.mockReturnValue({
    authError: null,
    appPublicSettings: null,
    canAccessParentAssignments: true,
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
      activeLearner: {
        avatarId: 'fox',
        createdAt: '2026-03-08T10:00:00.000Z',
        displayName: 'Maja',
        id: 'learner-2',
        loginName: 'maja',
        ownerUserId: 'admin-1',
        status: 'active',
        updatedAt: '2026-03-08T10:00:00.000Z',
      },
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
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.queryByTestId('kangur-elevated-user-menu-trigger')).toBeNull();
  expect(await screen.findByRole('link', { name: 'Profil Maja' })).toHaveAttribute(
    'href',
    '/kangur/profile'
  );
  expect(screen.queryByRole('menuitem', { name: 'Profil Maja' })).toBeNull();
});

it('navigates to lessons on the first tap from the mobile menu', async () => {
  setViewport({ width: 390, matches: true });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  fireEvent.click(screen.getByTestId('kangur-primary-nav-mobile-toggle'));
  fireEvent.click(screen.getByRole('link', { name: /lekcje/i }));

  expect(pushMock).toHaveBeenCalledWith('/kangur/lessons', { scroll: false });
});

it('marks the lessons nav action as transitioning while the managed route handoff is in flight', () => {
  routeTransitionStateMock.mockReturnValue({
    activeTransitionKind: 'navigation',
    activeTransitionPageKey: 'Lessons',
    activeTransitionRequestedHref: '/kangur/lessons',
    activeTransitionSkeletonVariant: 'lessons-library',
    activeTransitionSourceId: 'kangur-primary-nav:lessons',
    isRouteAcknowledging: false,
    isRoutePending: true,
    isRouteRevealing: false,
    isRouteWaitingForReady: false,
    pendingPageKey: 'Lessons',
    transitionPhase: 'pending',
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  expect(screen.getByTestId('kangur-primary-nav-lessons')).toHaveAttribute(
    'data-nav-state',
    'transitioning'
  );
});

it('closes the mobile menu when the current Kangur page changes', async () => {
  setViewport({ width: 390, matches: true });

  const { rerender } = render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Game'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  fireEvent.click(screen.getByTestId('kangur-primary-nav-mobile-toggle'));
  expect(screen.getByRole('dialog', { name: /menu kangur/i })).toBeVisible();

  rerender(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /menu kangur/i })).not.toBeInTheDocument();
  });
});

it('exposes chooser dialog state for assistive technology', async () => {
  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const subjectButton = screen.getByTestId('kangur-primary-nav-subject');
  const ageGroupButton = screen.getByTestId('kangur-primary-nav-age-group');

  expect(subjectButton).toHaveAttribute('aria-haspopup', 'dialog');
  expect(subjectButton).toHaveAttribute('aria-controls', 'kangur-primary-nav-subject-dialog');
  expect(subjectButton).toHaveAttribute('aria-expanded', 'false');
  expect(ageGroupButton).toHaveAttribute('aria-haspopup', 'dialog');
  expect(ageGroupButton).toHaveAttribute('aria-controls', 'kangur-primary-nav-age-group-dialog');
  expect(ageGroupButton).toHaveAttribute('aria-expanded', 'false');

  fireEvent.click(subjectButton);

  expect(subjectButton).toHaveAttribute('aria-expanded', 'true');
  expect(await screen.findByRole('dialog')).toHaveAttribute('id', 'kangur-primary-nav-subject-dialog');
  fireEvent.click(screen.getByRole('button', { name: /gotowe/i }));
  await waitFor(() => {
    expect(subjectButton).toHaveAttribute('aria-expanded', 'false');
  });
});

it('announces mobile menu guidance for assistive technology', () => {
  setViewport({ width: 390, matches: true });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const mobileToggle = screen.getByTestId('kangur-primary-nav-mobile-toggle');

  fireEvent.click(mobileToggle);

  const mobileMenuDialog = screen.getByRole('dialog', { name: /menu kangur/i });
  const subjectButton = within(mobileMenuDialog).getByTestId('kangur-primary-nav-subject');
  const ageGroupButton = within(mobileMenuDialog).getByTestId('kangur-primary-nav-age-group');

  expect(mobileToggle).toHaveAttribute('aria-expanded', 'true');
  expect(mobileMenuDialog).toHaveAttribute('aria-describedby', 'kangur-mobile-menu-description');
  expect(screen.getByText(/użyj klawisza tab/i)).toHaveClass('sr-only');
  expect(subjectButton).toHaveAttribute('aria-haspopup', 'dialog');
  expect(subjectButton).toHaveAttribute('aria-controls', 'kangur-primary-nav-subject-dialog');
  expect(ageGroupButton).toHaveAttribute('aria-haspopup', 'dialog');
  expect(ageGroupButton).toHaveAttribute('aria-controls', 'kangur-primary-nav-age-group-dialog');
});

it('restores focus to the mobile toggle when the mobile menu closes with Escape', async () => {
  const user = userEvent.setup();
  setViewport({ width: 390, matches: true });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  const mobileToggle = screen.getByTestId('kangur-primary-nav-mobile-toggle');
  mobileToggle.focus();

  fireEvent.click(mobileToggle);

  const mobileMenuDialog = screen.getByRole('dialog', { name: /menu kangur/i });
  const closeButton = within(mobileMenuDialog).getByRole('button', { name: /zamknij menu/i });

  await waitFor(() => {
    expect(closeButton).toHaveFocus();
  });

  await user.keyboard('{Escape}');

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /menu kangur/i })).not.toBeInTheDocument();
  });
  expect(mobileToggle).toHaveFocus();
});

it('traps keyboard focus inside the mobile menu dialog', async () => {
  const user = userEvent.setup();
  setViewport({ width: 390, matches: true });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={vi.fn()}
    />
  );

  fireEvent.click(screen.getByTestId('kangur-primary-nav-mobile-toggle'));

  const mobileMenuDialog = screen.getByRole('dialog', { name: /menu kangur/i });
  const focusable = Array.from(
    mobileMenuDialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
  const firstFocusable = focusable.at(0);
  const lastFocusable = focusable.at(-1);

  expect(firstFocusable).toBeDefined();
  expect(lastFocusable).toBeDefined();

  firstFocusable?.focus();
  await user.tab({ shift: true });
  expect(lastFocusable).toHaveFocus();

  lastFocusable?.focus();
  await user.tab();
  expect(firstFocusable).toHaveFocus();
});

it('disables the logout action while auth logout is already pending', () => {
  const onLogout = vi.fn();
  optionalAuthMock.mockReturnValue({
    authError: null,
    appPublicSettings: null,
    canAccessParentAssignments: true,
    checkAppState: vi.fn(),
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoggingOut: true,
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
      actorType: 'learner',
      canManageLearners: false,
      email: 'maja@example.com',
      full_name: 'Maja',
      id: 'learner-2',
      learners: [],
      ownerUserId: 'parent-1',
      role: 'user',
    },
  });

  render(
    <KangurPrimaryNavigation
      basePath='/kangur'
      currentPage='Lessons'
      isAuthenticated
      onLogout={onLogout}
    />
  );

  const logoutButton = screen.getByTestId('kangur-primary-nav-logout');

  expect(logoutButton).toBeDisabled();
  expect(logoutButton).toHaveTextContent('Wylogowywanie...');

  fireEvent.click(logoutButton);

  expect(onLogout).not.toHaveBeenCalled();
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

  fireEvent.click(screen.getByRole('button', { name: 'Switch to Sunset theme' }));

  expect(screen.getByRole('button', { name: 'Switch to Nightly theme' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Switch to Nightly theme' }));

  expect(screen.getByRole('button', { name: 'Switch to Daily theme' })).toBeInTheDocument();
});

});
