/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';

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

const TESTS_NAVIGATION = {
  ...LESSONS_NAVIGATION,
  currentPage: 'Tests' as const,
  showParentDashboard: false,
};

describe('KangurTopNavigationController', () => {
  it('renders the navigation locally when no shared host is present', () => {
    render(<KangurTopNavigationController navigation={LESSONS_NAVIGATION} />);

    expect(
      screen.getByRole('navigation', { name: /glowna nawigacja kangur/i })
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
      screen.getByRole('navigation', { name: /glowna nawigacja kangur/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: /glowna nawigacja kangur/i })).toHaveLength(1);
    expect(screen.getByTestId('kangur-primary-nav-lessons')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('kangur-primary-nav-parent-dashboard')).toBeInTheDocument();

    rerender(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <KangurTopNavigationController navigation={TESTS_NAVIGATION} />
      </KangurTopNavigationProvider>
    );

    expect(screen.getAllByRole('navigation', { name: /glowna nawigacja kangur/i })).toHaveLength(1);
    expect(screen.getByTestId('kangur-primary-nav-tests')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByTestId('kangur-primary-nav-parent-dashboard')).toBeNull();
  });
});
