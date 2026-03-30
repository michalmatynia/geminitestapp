/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';

const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());
const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));
const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionMock(),
}));

import { KangurTopNavigationController } from './KangurTopNavigationController';

function LessonsNavigationController(): React.JSX.Element {
  return <KangurTopNavigationController navigation={LESSONS_NAVIGATION} />;
}

function HiddenGameNavigationController(): React.JSX.Element {
  return <KangurTopNavigationController navigation={GAME_NAVIGATION} visible={false} />;
}

const LESSONS_NAVIGATION = {
  basePath: '/kangur',
  canManageLearners: true,
  contentClassName: 'justify-center',
  currentPage: 'Lessons' as const,
  isAuthenticated: false,
  onLogin: (): void => {},
  onLogout: (): void => {},
};

const GAME_NAVIGATION = {
  ...LESSONS_NAVIGATION,
  currentPage: 'Game' as const,
  showParentDashboard: false,
};

const GAMES_LIBRARY_NAVIGATION = {
  ...LESSONS_NAVIGATION,
  currentPage: 'GamesLibrary' as const,
};

describe('KangurTopNavigationController', () => {
  beforeEach(() => {
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
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
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'guest',
    });
  });

  it('renders the navigation locally when no shared host is present', () => {
    render(<KangurTopNavigationController navigation={LESSONS_NAVIGATION} />);

    expect(
      screen.getByRole('navigation', { name: /główna nawigacja kangur/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('kangur-primary-nav-lessons')).toHaveAttribute('aria-current', 'page');
  });

  it('sanitizes blocked GamesLibrary navigation when rendering locally without a host', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          image: null,
          name: 'Admin',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(<KangurTopNavigationController navigation={GAMES_LIBRARY_NAVIGATION} />);

    expect(screen.getByTestId('kangur-primary-nav-home')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByTestId('kangur-primary-nav-games-library')).toBeNull();
  });

  it('keeps the visible logout button when an elevated authenticated session is rendered locally', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();

    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          image: null,
          name: 'Super Admin',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    render(
      <KangurTopNavigationController
        navigation={{
          ...LESSONS_NAVIGATION,
          isAuthenticated: true,
          onLogout,
        }}
      />
    );

    expect(
      await screen.findByTestId('kangur-elevated-user-menu-trigger')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toHaveAttribute(
      'data-testid',
      'kangur-primary-nav-logout'
    );

    await user.click(screen.getByRole('button', { name: 'Wyloguj' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('keeps the visible logout button when an elevated authenticated session is rendered through the shared host', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();

    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          image: null,
          name: 'Super Admin',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    render(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <KangurTopNavigationController
          navigation={{
            ...LESSONS_NAVIGATION,
            isAuthenticated: true,
            onLogout,
          }}
        />
      </KangurTopNavigationProvider>
    );

    expect(
      await screen.findByTestId('kangur-elevated-user-menu-trigger')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toHaveAttribute(
      'data-testid',
      'kangur-primary-nav-logout'
    );

    await user.click(screen.getByRole('button', { name: 'Wyloguj' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders through the shared host and updates in place when the page changes', () => {
    const { rerender } = render(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <KangurTopNavigationController navigation={LESSONS_NAVIGATION} />
      </KangurTopNavigationProvider>
    );

    expect(
      screen.getByRole('navigation', { name: /główna nawigacja kangur/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: /główna nawigacja kangur/i })).toHaveLength(1);
    expect(screen.getByTestId('kangur-primary-nav-lessons')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('kangur-primary-nav-parent-dashboard')).toBeInTheDocument();

    rerender(
        <KangurTopNavigationProvider>
          <KangurTopNavigationHost />
          <KangurTopNavigationController navigation={GAME_NAVIGATION} />
        </KangurTopNavigationProvider>
      );

    expect(screen.getAllByRole('navigation', { name: /główna nawigacja kangur/i })).toHaveLength(1);
    expect(screen.getByTestId('kangur-primary-nav-home')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByTestId('kangur-primary-nav-parent-dashboard')).toBeNull();
  });

  it('clears the shared host immediately when visibility is disabled', () => {
    const { rerender } = render(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <KangurTopNavigationController navigation={GAME_NAVIGATION} visible />
      </KangurTopNavigationProvider>
    );

    expect(
      screen.getByRole('navigation', { name: /główna nawigacja kangur/i })
    ).toBeInTheDocument();

    rerender(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <KangurTopNavigationController navigation={GAME_NAVIGATION} visible={false} />
      </KangurTopNavigationProvider>
    );

    expect(screen.queryByRole('navigation', { name: /główna nawigacja kangur/i })).toBeNull();
  });

  it('clears the previous owner navigation immediately when a hidden controller replaces it', () => {
    const { rerender } = render(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <LessonsNavigationController />
      </KangurTopNavigationProvider>
    );

    expect(
      screen.getByRole('navigation', { name: /główna nawigacja kangur/i })
    ).toBeInTheDocument();

    rerender(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <HiddenGameNavigationController />
      </KangurTopNavigationProvider>
    );

    expect(screen.queryByRole('navigation', { name: /główna nawigacja kangur/i })).toBeNull();
  });
});
