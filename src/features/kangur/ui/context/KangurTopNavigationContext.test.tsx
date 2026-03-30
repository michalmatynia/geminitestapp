/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hostedNavigationPropsMock = vi.fn();
const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionMock(),
}));

vi.mock('@/features/kangur/ui/components/KangurPrimaryNavigation', () => ({
  KangurPrimaryNavigation: (props: Record<string, unknown>) => {
    hostedNavigationPropsMock(props);
    return <div data-testid='kangur-top-navigation-hosted' />;
  },
}));

import {
  KangurTopNavigationHost,
  KangurTopNavigationProvider,
  useOptionalKangurTopNavigation,
} from '@/features/kangur/ui/context/KangurTopNavigationContext';

function TopNavigationTestControls(): React.JSX.Element {
  const topNavigation = useOptionalKangurTopNavigation();

  return (
    <>
      <button
        type='button'
        onClick={() =>
          topNavigation?.setNavigation('test-owner', {
            basePath: '/kangur',
            currentPage: 'Lessons',
            isAuthenticated: true,
            onLogout: vi.fn(),
          })
        }
      >
        Set navigation
      </button>
      <button
        type='button'
        onClick={() =>
          topNavigation?.setNavigation('test-owner', {
            basePath: '/kangur',
            currentPage: 'GamesLibrary',
            isAuthenticated: true,
            onLogout: vi.fn(),
          })
        }
      >
        Set blocked navigation
      </button>
      <button
        type='button'
        onClick={() => topNavigation?.clearNavigation('test-owner', { immediate: true })}
      >
        Clear navigation
      </button>
    </>
  );
}

describe('KangurTopNavigationHost', () => {
  beforeEach(() => {
    hostedNavigationPropsMock.mockClear();
    sessionMock.mockReset();
  });

  it('sanitizes blocked GamesLibrary navigation before rendering the hosted nav', async () => {
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

    render(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost />
        <TopNavigationTestControls />
      </KangurTopNavigationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set blocked navigation' }));

    await waitFor(() =>
      expect(hostedNavigationPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPage: 'Game',
          forceLanguageSwitcherFallbackPath: true,
        })
      )
    );
  });

  it('renders the fallback until navigation is registered and restores it after an immediate clear', () => {
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(
      <KangurTopNavigationProvider>
        <KangurTopNavigationHost fallback={<div data-testid='kangur-top-navigation-fallback' />} />
        <TopNavigationTestControls />
      </KangurTopNavigationProvider>
    );

    expect(screen.getByTestId('kangur-top-navigation-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-top-navigation-hosted')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Set navigation' }));

    expect(screen.getByTestId('kangur-top-navigation-hosted')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-top-navigation-fallback')).toBeNull();
    expect(hostedNavigationPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        currentPage: 'Lessons',
        isAuthenticated: true,
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear navigation' }));

    expect(screen.getByTestId('kangur-top-navigation-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-top-navigation-hosted')).toBeNull();
  });
});
