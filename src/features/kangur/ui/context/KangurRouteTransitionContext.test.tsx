/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@/__tests__/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurRouteTransitionProvider,
  useKangurRouteTransition,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';

function RouteTransitionProbe({
  acknowledgeMs,
  sourceId,
  targetHref,
  targetPageKey,
  transitionKind,
}: {
  acknowledgeMs?: number;
  sourceId?: string;
  targetHref: string;
  targetPageKey: string;
  transitionKind?: 'navigation' | 'locale-switch';
}): React.JSX.Element {
  const {
    isRouteAcknowledging,
    isRoutePending,
    isRouteWaitingForReady,
    isRouteRevealing,
    transitionPhase,
    activeTransitionSourceId,
    activeTransitionKind,
    activeTransitionPageKey,
    activeTransitionRequestedHref,
    activeTransitionSkeletonVariant,
    pendingPageKey,
    startRouteTransition,
    markRouteTransitionReady,
  } = useKangurRouteTransition();

  return (
    <div>
      <div data-testid='route-transition-acknowledging'>{String(isRouteAcknowledging)}</div>
      <div data-testid='route-transition-pending'>{String(isRoutePending)}</div>
      <div data-testid='route-transition-waiting'>{String(isRouteWaitingForReady)}</div>
      <div data-testid='route-transition-revealing'>{String(isRouteRevealing)}</div>
      <div data-testid='route-transition-phase'>{transitionPhase}</div>
      <div data-testid='route-transition-source-id'>{activeTransitionSourceId ?? 'none'}</div>
      <div data-testid='route-transition-kind'>{activeTransitionKind ?? 'none'}</div>
      <div data-testid='route-transition-active-page-key'>{activeTransitionPageKey ?? 'none'}</div>
      <div data-testid='route-transition-active-href'>{activeTransitionRequestedHref ?? 'none'}</div>
      <div data-testid='route-transition-skeleton-variant'>
        {activeTransitionSkeletonVariant ?? 'none'}
      </div>
      <div data-testid='route-transition-page-key'>{pendingPageKey ?? 'none'}</div>
      <button
        type='button'
        onClick={() =>
          startRouteTransition({
            ...(typeof acknowledgeMs === 'number' ? { acknowledgeMs } : {}),
            ...(sourceId ? { sourceId } : {}),
            ...(transitionKind ? { transitionKind } : {}),
            href: targetHref,
            pageKey: targetPageKey,
          })
        }
      >
        Start transition
      </button>
      <button
        type='button'
        onClick={() =>
          markRouteTransitionReady({
            pageKey: targetPageKey,
            requestedHref: targetHref,
          })
        }
      >
        Mark ready
      </button>
    </div>
  );
}

function renderRouteTransitionHarness({
  acknowledgeMs,
  pageKey,
  requestedPath,
  requestedHref = requestedPath,
  sourceId,
  targetHref = '/kangur/lessons',
  targetPageKey = 'Lessons',
  transitionKind,
}: {
  acknowledgeMs?: number;
  pageKey: string;
  requestedPath: string;
  requestedHref?: string;
  sourceId?: string;
  targetHref?: string;
  targetPageKey?: string;
  transitionKind?: 'navigation' | 'locale-switch';
}) {
  return render(
    <KangurRoutingProvider
      basePath='/kangur'
      pageKey={pageKey}
      requestedPath={requestedPath}
      requestedHref={requestedHref}
    >
      <KangurRouteTransitionProvider>
        <RouteTransitionProbe
          acknowledgeMs={acknowledgeMs}
          sourceId={sourceId}
          targetHref={targetHref}
          targetPageKey={targetPageKey}
          transitionKind={transitionKind}
        />
      </KangurRouteTransitionProvider>
    </KangurRoutingProvider>
  );
}

describe('KangurRouteTransitionProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resets scroll after a Kangur route transition commits to a new requested path', async () => {
    const scrollToMock = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-acknowledging')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-page-key')).toHaveTextContent('Lessons');

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/kangur/lessons'
          requestedHref='/kangur/lessons'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe targetHref='/kangur/lessons' targetPageKey='Lessons' />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(scrollToMock).toHaveBeenCalledWith({ left: 0, top: 0, behavior: 'auto' });
    expect(scrollToMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('route-transition-acknowledging')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-active-href')).toHaveTextContent(
      '/kangur/lessons'
    );
    expect(screen.getByTestId('route-transition-active-page-key')).toHaveTextContent('Lessons');
    expect(screen.getByTestId('route-transition-page-key')).toHaveTextContent('none');
    expect(screen.getByTestId('route-transition-skeleton-variant')).toHaveTextContent(
      'lessons-library'
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark ready' }));
    });

    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('false');
  });

  it('keeps locale-switch transitions on the same page and marks them distinctly', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Lessons',
      requestedPath: '/pl/lessons',
      requestedHref: '/pl/lessons',
      targetHref: '/en/lessons',
      targetPageKey: 'Lessons',
      transitionKind: 'locale-switch',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    expect(screen.getByTestId('route-transition-kind')).toHaveTextContent('locale-switch');

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/en/lessons'
          requestedHref='/en/lessons'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe targetHref='/en/lessons' targetPageKey='Lessons' />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('route-transition-active-page-key')).toHaveTextContent('Lessons');
    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('true');
  });

  it('reveals a locale-switch to the default Polish route sooner when page ready is delayed', async () => {
    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Lessons',
      requestedPath: '/en/lessons',
      requestedHref: '/en/lessons',
      targetHref: '/lessons',
      targetPageKey: 'Lessons',
      transitionKind: 'locale-switch',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/lessons'
          requestedHref='/lessons'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe
              targetHref='/lessons'
              targetPageKey='Lessons'
              transitionKind='locale-switch'
            />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(1_199);
    });

    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('false');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('true');
  });

  it('uses a shorter reveal window for locale-switch transitions', async () => {
    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Lessons',
      requestedPath: '/en/lessons',
      requestedHref: '/en/lessons',
      targetHref: '/lessons',
      targetPageKey: 'Lessons',
      transitionKind: 'locale-switch',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/lessons'
          requestedHref='/lessons'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe
              targetHref='/lessons'
              targetPageKey='Lessons'
              transitionKind='locale-switch'
            />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark ready' }));
    });

    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(119);
    });

    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('false');
  });

  it('allows a locale-switch to supersede an in-flight locale-switch before reveal', async () => {
    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Lessons',
      requestedPath: '/en/lessons',
      requestedHref: '/en/lessons',
      targetHref: '/lessons',
      targetPageKey: 'Lessons',
      transitionKind: 'locale-switch',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/lessons'
          requestedHref='/lessons'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe
              targetHref='/de/lessons'
              targetPageKey='Lessons'
              transitionKind='locale-switch'
            />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-active-href')).toHaveTextContent('/lessons');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    expect(screen.getByTestId('route-transition-kind')).toHaveTextContent('locale-switch');
    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-active-href')).toHaveTextContent('/de/lessons');
  });

  it('clears a pending transition if the navigation takes too long', () => {
    renderRouteTransitionHarness({
      pageKey: 'Game',
      requestedPath: '/kangur',
      targetHref: '/kangur/profile',
      targetPageKey: 'LearnerProfile',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-page-key')).toHaveTextContent('none');
  });

  it('keeps a source-aware transition in the acknowledgement phase before promoting it to pending', () => {
    renderRouteTransitionHarness({
      acknowledgeMs: 110,
      pageKey: 'Game',
      requestedPath: '/kangur',
      sourceId: 'game-home-action:lessons',
      targetHref: '/kangur/lessons',
      targetPageKey: 'Lessons',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));

    expect(screen.getByTestId('route-transition-acknowledging')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-phase')).toHaveTextContent('acknowledging');
    expect(screen.getByTestId('route-transition-source-id')).toHaveTextContent(
      'game-home-action:lessons'
    );

    act(() => {
      vi.advanceTimersByTime(109);
    });

    expect(screen.getByTestId('route-transition-acknowledging')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('route-transition-acknowledging')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-phase')).toHaveTextContent('pending');
    expect(screen.getByTestId('route-transition-source-id')).toHaveTextContent(
      'game-home-action:lessons'
    );
  });

  it('commits query-driven transitions when the requested href changes without a page-key change', async () => {
    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur/lessons',
      targetHref: '/kangur/lessons?focus=adding',
      targetPageKey: 'Lessons',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/kangur/lessons'
          requestedHref='/kangur/lessons?focus=adding'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe
              targetHref='/kangur/lessons?focus=adding'
              targetPageKey='Lessons'
            />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('false');
    expect(screen.getByTestId('route-transition-waiting')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-active-href')).toHaveTextContent(
      '/kangur/lessons?focus=adding'
    );
    expect(screen.getByTestId('route-transition-skeleton-variant')).toHaveTextContent(
      'lessons-focus'
    );
  });

  it('accepts a new transition while the previous one is still revealing', async () => {
    const { rerender } = renderRouteTransitionHarness({
      pageKey: 'Game',
      requestedPath: '/kangur',
      requestedHref: '/kangur',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/kangur/lessons'
          requestedHref='/kangur/lessons'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe targetHref='/kangur/lessons' targetPageKey='Lessons' />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark ready' }));
    });

    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('true');

    await act(async () => {
      rerender(
        <KangurRoutingProvider
          basePath='/kangur'
          pageKey='Lessons'
          requestedPath='/kangur/lessons'
          requestedHref='/kangur/lessons'
        >
          <KangurRouteTransitionProvider>
            <RouteTransitionProbe
              targetHref='/kangur/profile'
              targetPageKey='LearnerProfile'
            />
          </KangurRouteTransitionProvider>
        </KangurRoutingProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start transition' }));
    });

    expect(screen.getByTestId('route-transition-pending')).toHaveTextContent('true');
    expect(screen.getByTestId('route-transition-revealing')).toHaveTextContent('false');
  });
});
