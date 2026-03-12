/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';

const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurTopNavigationController } from './KangurTopNavigationController';

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

describe('KangurTopNavigationController', () => {
  beforeEach(() => {
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
  });

  it('renders the navigation locally when no shared host is present', () => {
    render(<KangurTopNavigationController navigation={LESSONS_NAVIGATION} />);

    expect(
      screen.getByRole('navigation', { name: /główna nawigacja kangur/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('kangur-primary-nav-lessons')).toHaveAttribute('aria-current', 'page');
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
});
