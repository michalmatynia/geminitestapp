/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurRouteTransitionProvider,
  useKangurRouteTransition,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';

function RouteTransitionProbe({
  targetHref,
  targetPageKey,
}: {
  targetHref: string;
  targetPageKey: string;
}): React.JSX.Element {
  const { isRoutePending, pendingPageKey, startRouteTransition } = useKangurRouteTransition();

  return (
    <div>
      <div data-testid='route-transition-pending'>{String(isRoutePending)}</div>
      <div data-testid='route-transition-page-key'>{pendingPageKey ?? 'none'}</div>
      <button
        type='button'
        onClick={() => startRouteTransition({ href: targetHref, pageKey: targetPageKey })}
      >
        Start transition
      </button>
    </div>
  );
}

function renderRouteTransitionHarness({
  pageKey,
  requestedPath,
  targetHref = '/kangur/lessons',
  targetPageKey = 'Lessons',
}: {
  pageKey: string;
  requestedPath: string;
  targetHref?: string;
  targetPageKey?: string;
}) {
  return render(
    <KangurRoutingProvider basePath='/kangur' pageKey={pageKey} requestedPath={requestedPath}>
      <KangurRouteTransitionProvider>
        <RouteTransitionProbe targetHref={targetHref} targetPageKey={targetPageKey} />
      </KangurRouteTransitionProvider>
    </KangurRoutingProvider>
  );
}

describe('KangurRouteTransitionProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('resets scroll after a Kangur route transition commits to a new requested path', () => {
    const scrollToMock = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const requestAnimationFrameMock = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(0);
        return 1;
      });
    const cancelAnimationFrameMock = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined);

    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-page-key')).toHaveTextContent('Lessons');

    rerender(
      <KangurRoutingProvider
        basePath='/kangur'
        pageKey='Lessons'
        requestedPath='/kangur/lessons'
      >
        <KangurRouteTransitionProvider>
          <RouteTransitionProbe targetHref='/kangur/lessons' targetPageKey='Lessons' />
        </KangurRouteTransitionProvider>
      </KangurRoutingProvider>
    );

    act(() => {
      vi.advanceTimersByTime(560);
    });

    expect(scrollToMock).toHaveBeenNthCalledWith(1, { left: 0, top: 0, behavior: 'auto' });
    expect(scrollToMock).toHaveBeenNthCalledWith(2, { left: 0, top: 0, behavior: 'auto' });
    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');

    scrollToMock.mockRestore();
    requestAnimationFrameMock.mockRestore();
    cancelAnimationFrameMock.mockRestore();
  });

  it('clears a pending transition if the navigation takes too long', () => {
    renderRouteTransitionHarness({
      pageKey: 'Game',
      requestedPath: '/kangur',
      targetHref: '/kangur/tests',
      targetPageKey: 'Tests',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-page-key')).toHaveTextContent('none');
  });
});
