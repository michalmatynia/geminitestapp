/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
}));

import {
  KangurRoutingProvider,
  useKangurRouting,
} from '@/features/kangur/ui/context/KangurRoutingContext';

function RoutingProbe(): React.JSX.Element {
  const routing = useKangurRouting();

  return (
    <div>
      <div data-testid='kangur-routing-page-key'>{routing.pageKey ?? 'none'}</div>
      <div data-testid='kangur-routing-requested-path'>{routing.requestedPath ?? 'none'}</div>
      <div data-testid='kangur-routing-requested-href'>{routing.requestedHref ?? 'none'}</div>
      <div data-testid='kangur-routing-base-path'>{routing.basePath}</div>
    </div>
  );
}

describe('KangurRoutingProvider', () => {
  beforeEach(() => {
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
  });

  it('downgrades blocked GamesLibrary routing state for non-super-admin sessions', () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(
      <KangurRoutingProvider
        basePath='/kangur'
        pageKey='GamesLibrary'
        requestedPath='/kangur/games'
        requestedHref='/kangur/games?tab=runtime#structure'
      >
        <RoutingProbe />
      </KangurRoutingProvider>
    );

    expect(screen.getByTestId('kangur-routing-page-key')).toHaveTextContent('Game');
    expect(screen.getByTestId('kangur-routing-requested-path')).toHaveTextContent('/kangur');
    expect(screen.getByTestId('kangur-routing-requested-href')).toHaveTextContent('/kangur');
    expect(screen.getByTestId('kangur-routing-base-path')).toHaveTextContent('/kangur');
  });

  it('keeps GamesLibrary routing state for exact super-admin sessions', () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'super-admin@example.com',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });

    render(
      <KangurRoutingProvider
        basePath='/kangur'
        pageKey='GamesLibrary'
        requestedPath='/kangur/games'
        requestedHref='/kangur/games?tab=runtime#structure'
      >
        <RoutingProbe />
      </KangurRoutingProvider>
    );

    expect(screen.getByTestId('kangur-routing-page-key')).toHaveTextContent('GamesLibrary');
    expect(screen.getByTestId('kangur-routing-requested-path')).toHaveTextContent('/kangur/games');
    expect(screen.getByTestId('kangur-routing-requested-href')).toHaveTextContent(
      '/kangur/games?tab=runtime#structure'
    );
    expect(screen.getByTestId('kangur-routing-base-path')).toHaveTextContent('/kangur');
  });
});
