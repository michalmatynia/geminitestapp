/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLatchedKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';
import {
  authStateMock,
  loginModalStateMock,
  pendingRouteLoadingSnapshotMock,
  preloadKangurPageMock,
  routingStateMock,
  routeNavigatorMock,
  routeTransitionStateMock,
  sessionMock,
  setupKangurFeatureAppTest,
  settingsStoreStateMock,
  topNavigationHostVisibleMock,
} from '@/features/kangur/ui/KangurFeatureApp.test-support';

let KangurFeatureApp: typeof import('@/features/kangur/ui/KangurFeatureApp').KangurFeatureApp;

describe('KangurFeatureApp', () => {
  beforeEach(async () => {
    KangurFeatureApp = await setupKangurFeatureAppTest();
  });

  afterEach(() => {
    cleanup();
    clearLatchedKangurTopBarHeightCssValue();
    document.documentElement.style.removeProperty('--kangur-top-bar-height');
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the resolved Kangur page content once auth is ready', () => {
    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-top-navigation-host')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute(
      'data-route-capture-ready',
      'true'
    );
    expect(screen.getByTestId('kangur-page-lessons')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
    expect(screen.queryByTestId('kangur-login-modal')).toBeNull();
  });

  it('preloads the hot Lessons page after the Game route settles', async () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });

    render(<KangurFeatureApp />);

    await act(async () => {
      vi.runAllTimers();
    });

    expect(preloadKangurPageMock).toHaveBeenCalledWith('Lessons');
  });

  it('preloads the hot Game page after the Lessons route settles', async () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Lessons',
      embedded: false,
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur/lessons',
      basePath: '/kangur',
    });

    render(<KangurFeatureApp />);

    await act(async () => {
      vi.runAllTimers();
    });

    expect(preloadKangurPageMock).toHaveBeenCalledWith('Game');
  });

  it('cancels scheduled hot-route preloads when requestIdleCallback is available and the app unmounts first', () => {
    const requestIdleCallbackMock = vi.fn(() => 41);
    const cancelIdleCallbackMock = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallbackMock);
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallbackMock);
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });

    const { unmount } = render(<KangurFeatureApp />);

    expect(requestIdleCallbackMock).toHaveBeenCalled();
    expect(requestIdleCallbackMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 250,
    });
    expect(preloadKangurPageMock).not.toHaveBeenCalled();

    unmount();

    expect(cancelIdleCallbackMock).toHaveBeenCalledWith(41);
    expect(preloadKangurPageMock).not.toHaveBeenCalled();
  });

  it('does not preload the same hot route twice after returning to the original page', async () => {
    let currentRoutingState = {
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    };
    routingStateMock.mockImplementation(() => currentRoutingState);

    const { rerender } = render(<KangurFeatureApp />);

    await act(async () => {
      vi.runAllTimers();
    });

    currentRoutingState = {
      pageKey: 'GamesLibrary',
      embedded: false,
      requestedPath: '/kangur/games',
      requestedHref: '/kangur/games',
      basePath: '/kangur',
    };
    rerender(<KangurFeatureApp />);

    currentRoutingState = {
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    };
    rerender(<KangurFeatureApp />);

    await act(async () => {
      vi.runAllTimers();
    });

    expect(preloadKangurPageMock).toHaveBeenCalledTimes(1);
    expect(preloadKangurPageMock).toHaveBeenCalledWith('Lessons');
  });

  it('renders the sanitized fallback route content when blocked GamesLibrary routes were downgraded upstream', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          name: 'Admin',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-game')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-games-library')).toBeNull();
    expect(screen.queryByTestId('kangur-page-not-found')).toBeNull();
  });

  it('renders the Games library route when routing state already resolved it', () => {
    sessionMock.mockReturnValue({
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'super-admin@example.com',
          id: 'admin-1',
          isElevated: true,
          name: 'Super Admin',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });
    routingStateMock.mockReturnValue({
      pageKey: 'GamesLibrary',
      embedded: false,
      requestedPath: '/kangur/games',
      requestedHref: '/kangur/games',
      basePath: '/kangur',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-games-library')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-not-found')).toBeNull();
  });

  it('mounts the login modal only when the modal state is open', () => {
    loginModalStateMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      homeHref: '/kangur',
      isOpen: true,
      isRouteDriven: false,
      showParentAuthModeTabs: true,
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-login-modal')).toBeInTheDocument();
  });

  it('renders the navbar skeleton while the shared top-navigation host has not registered yet', () => {
    topNavigationHostVisibleMock.mockReturnValue(false);

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-top-navigation-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-top-navigation-host')).toBeNull();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
  });

  it('uses deferred page skeletons instead of the global app loader during route transitions', async () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Game',
      activeTransitionRequestedHref: '/kangur',
      activeTransitionSkeletonVariant: 'game-home',
      pendingPageKey: 'Game',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Game:game-home');
  });

  it('shows the pending route snapshot skeleton immediately on the first click handoff', () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });
    pendingRouteLoadingSnapshotMock.mockReturnValue({
      fromHref: '/kangur',
      href: '/kangur/lessons',
      pageKey: 'Lessons',
      skeletonVariant: 'lessons-library',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-library'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('kangur-route-content')).toHaveClass('overflow-hidden');
  });

  it('lets the pending route skeleton own the navbar while the shared host is unresolved', async () => {
    topNavigationHostVisibleMock.mockReturnValue(false);
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByTestId('kangur-top-navigation-skeleton')).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Lessons:lessons-library');
  });

  it('keeps the target route hidden while the destination is still loading', () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteWaitingForReady: true,
      isRouteRevealing: false,
      transitionPhase: 'waiting_for_ready',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons?focus=adding',
      activeTransitionSkeletonVariant: 'lessons-focus',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-focus'
    );
    expect(screen.getByTestId('kangur-route-content')).toHaveClass(
      'pointer-events-none',
      'opacity-0',
      'overflow-hidden'
    );
  });

  it('keeps the navigation skeleton visible through reveal after the destination becomes ready', async () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    const { rerender } = render(<KangurFeatureApp />);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-library'
    );

    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: true,
      transitionPhase: 'revealing',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    await act(async () => {
      rerender(<KangurFeatureApp />);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-library'
    );
    expect(screen.getByTestId('kangur-route-content')).not.toHaveClass('pointer-events-none');
    expect(screen.getByTestId('kangur-route-content')).toHaveClass('overflow-hidden');
    expect(screen.getByTestId('kangur-page-transition-skeleton').parentElement).toHaveClass(
      'pointer-events-none'
    );
  });

  it('keeps the last visible Home skeleton target latched if transition metadata momentarily drops during reveal', async () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Lessons',
      embedded: false,
      requestedPath: '/kangur/lessons',
      basePath: '/kangur',
    });
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: true,
      transitionPhase: 'revealing',
      activeTransitionSourceId: 'lessons:list-back',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Game',
      activeTransitionRequestedHref: '/kangur',
      activeTransitionSkeletonVariant: 'game-home',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    const { rerender } = render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Game:game-home'
    );

    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: true,
      transitionPhase: 'revealing',
      activeTransitionSourceId: 'lessons:list-back',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: null,
      activeTransitionRequestedHref: '/kangur',
      activeTransitionSkeletonVariant: null,
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    await act(async () => {
      rerender(<KangurFeatureApp />);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Game:game-home'
    );
  });

  it('keeps the target lessons skeleton visible during the button acknowledgement phase', () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: true,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'acknowledging',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-library'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton-motion')).toHaveAttribute(
      'data-motion-initial',
      JSON.stringify({ opacity: 1 })
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton-motion')).toHaveAttribute(
      'data-motion-animate',
      JSON.stringify({ opacity: 1 })
    );
    expect(screen.getByTestId('kangur-route-content')).toHaveClass(
      'pointer-events-none',
      'opacity-0'
    );
  });

  it('keeps the lessons skeleton latched when the first-click handoff moves into acknowledgement', async () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
    });
    pendingRouteLoadingSnapshotMock.mockReturnValue({
      fromHref: '/kangur',
      href: '/kangur/lessons',
      pageKey: 'Lessons',
      skeletonVariant: 'lessons-library',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    const { rerender } = render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-library'
    );
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute('aria-hidden', 'true');

    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: true,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'acknowledging',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    await act(async () => {
      rerender(<KangurFeatureApp />);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-library'
    );
    expect(screen.getByTestId('kangur-route-content')).toHaveClass(
      'pointer-events-none',
      'opacity-0'
    );
  });

  it('keeps the shared navbar host visible during the language-switch acknowledgement phase', () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: true,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'acknowledging',
      activeTransitionSourceId: 'kangur-language-switcher',
      activeTransitionKind: 'locale-switch',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/en/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-top-navigation-host')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-top-navigation-skeleton')).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'false'
    );
    expect(
      screen.queryByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Lessons:lessons-library');
    expect(screen.getByTestId('kangur-page-transition-skeleton-motion')).toHaveAttribute(
      'data-motion-initial',
      JSON.stringify({ opacity: 0 })
    );
    expect(screen.getByTestId('kangur-route-content')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('kangur-route-content')).not.toHaveClass('opacity-0');
    expect(screen.getByTestId('kangur-route-content')).not.toHaveClass('overflow-hidden');
  });

  it('falls back to a single shell navbar skeleton during language-switch acknowledgement when the host is unresolved', () => {
    topNavigationHostVisibleMock.mockReturnValue(false);
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: true,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'acknowledging',
      activeTransitionSourceId: 'kangur-language-switcher',
      activeTransitionKind: 'locale-switch',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/en/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-top-navigation-host')).toBeNull();
    expect(screen.getByTestId('kangur-top-navigation-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'false'
    );
    expect(
      screen.queryByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toBeNull();
  });

  it('shows the route skeleton with inline navbar immediately once a button-led handoff becomes pending', () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-top-navigation-host')).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-embedded-override',
      'false'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Lessons:lessons-library');
  });

  it('renders the very first home-to-lessons skeleton frame in standalone mode', async () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: true,
      requestedPath: '/',
      basePath: '/',
    });
    topNavigationHostVisibleMock.mockReturnValue(false);
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-top-navigation-host')).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-embedded-override',
      'false'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toBeInTheDocument();
  });

  it('lets the route skeleton take over the header even if the boot loader is still visible', () => {
    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: true,
      isFetching: false,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: true,
      requestedPath: '/',
      basePath: '/',
    });
    topNavigationHostVisibleMock.mockReturnValue(false);
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-embedded-override',
      'false'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
  });

  it('keeps standalone skeleton geometry when transitioning from lessons back to the embedded home route', () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Lessons',
      embedded: false,
      requestedPath: '/lessons',
      basePath: '/',
    });
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: 'lessons:list-back',
      activeTransitionPageKey: 'Game',
      activeTransitionRequestedHref: '/',
      activeTransitionSkeletonVariant: 'game-home',
      pendingPageKey: 'Game',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-top-navigation-host')).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-embedded-override',
      'false'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(
      screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')
    ).toBeInTheDocument();
  });

  it('latches the live top-bar height for the first visible route skeleton frame', async () => {
    document.documentElement.style.setProperty('--kangur-top-bar-height', '136px');
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    const { rerender } = render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-top-bar-height',
      '136px'
    );

    document.documentElement.style.setProperty('--kangur-top-bar-height', '104px');
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteWaitingForReady: true,
      isRouteRevealing: false,
      transitionPhase: 'waiting_for_ready',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    await act(async () => {
      rerender(<KangurFeatureApp />);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-top-bar-height',
      '136px'
    );
  });

});
