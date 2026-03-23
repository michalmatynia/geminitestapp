/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  markRouteTransitionReadyMock,
  routeTransitionStateMock,
  routingMock,
} = vi.hoisted(() => ({
  markRouteTransitionReadyMock: vi.fn(),
  routeTransitionStateMock: vi.fn(),
  routingMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionActions: () => ({
    markRouteTransitionReady: markRouteTransitionReadyMock,
  }),
  useOptionalKangurRouteTransitionState: () => routeTransitionStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => routingMock(),
}));

import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';

function RouteReadyProbe({
  pageKey = 'Lessons',
  ready = true,
}: {
  pageKey?: string;
  ready?: boolean;
}): React.JSX.Element | null {
  useKangurRoutePageReady({ pageKey, ready });
  return null;
}

describe('useKangurRoutePageReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routingMock.mockReturnValue({
      requestedHref: '/kangur/lessons',
      requestedPath: '/kangur/lessons',
    });
    routeTransitionStateMock.mockReturnValue({
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('marks the route ready immediately once the page reports readiness', () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1);

    render(<RouteReadyProbe />);

    expect(markRouteTransitionReadyMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedHref: '/kangur/lessons',
    });
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
  });
});
