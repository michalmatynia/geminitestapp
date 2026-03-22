/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const hostedNavigationPropsMock = vi.fn();

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
        onClick={() => topNavigation?.clearNavigation('test-owner', { immediate: true })}
      >
        Clear navigation
      </button>
    </>
  );
}

describe('KangurTopNavigationHost', () => {
  it('renders the fallback until navigation is registered and restores it after an immediate clear', () => {
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
