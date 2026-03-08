/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurRoutingMock } = vi.hoisted(() => ({
  useKangurRoutingMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

import {
  KangurRouteTransitionProvider,
  useKangurRouteTransition,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';

function RouteTransitionProbe(): React.JSX.Element {
  const { isRoutePending, pendingPageKey, startRouteTransition } = useKangurRouteTransition();

  return (
    <div>
      <div data-testid='route-transition-pending'>{String(isRoutePending)}</div>
      <div data-testid='route-transition-page-key'>{pendingPageKey ?? 'none'}</div>
      <button
        type='button'
        onClick={() =>
          startRouteTransition({
            href: '/kangur/lessons',
            pageKey: 'Lessons',
          })
        }
      >
        Start transition
      </button>
    </div>
  );
}

describe('KangurRouteTransitionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurRoutingMock.mockReturnValue({
      pageKey: 'Game',
      requestedPath: '/kangur/game',
      basePath: '/kangur',
      embedded: false,
    });
  });

  it('marks navigation as pending and clears once the requested path changes', async () => {
    const { rerender } = render(
      <KangurRouteTransitionProvider>
        <RouteTransitionProbe />
      </KangurRouteTransitionProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /start transition/i }));

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-page-key')).toHaveTextContent('Lessons');

    useKangurRoutingMock.mockReturnValue({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
      basePath: '/kangur',
      embedded: false,
    });

    rerender(
      <KangurRouteTransitionProvider>
        <RouteTransitionProbe />
      </KangurRouteTransitionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('route-transition-page-key')).toHaveTextContent('none');
  });
});
