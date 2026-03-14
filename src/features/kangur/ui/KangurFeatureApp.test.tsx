/**
 * @vitest-environment jsdom
 */

import React, { type ReactNode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authStateMock,
  routingStateMock,
  routeTransitionStateMock,
  routeNavigatorMock,
} = vi.hoisted(() => ({
  authStateMock: vi.fn(),
  routingStateMock: vi.fn(),
  routeTransitionStateMock: vi.fn(),
  routeNavigatorMock: {
    back: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

vi.mock('@/features/kangur/ui/components/KangurPageTransitionSkeleton', () => ({
  KangurPageTransitionSkeleton: ({
    pageKey,
    variant,
  }: {
    pageKey?: string | null;
    variant?: string | null;
  }) => (
    <div data-testid='kangur-page-transition-skeleton'>
      {pageKey ?? 'none'}:{variant ?? 'default'}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurAppLoader', () => ({
  KangurAppLoader: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid='kangur-app-loader' /> : null,
}));

vi.mock('@/features/kangur/ui/components/PageNotFound', () => ({
  PageNotFound: () => <div data-testid='kangur-page-not-found' />,
}));

vi.mock('@/features/kangur/ui/components/UserNotRegisteredError', () => ({
  default: () => <div data-testid='kangur-user-not-registered-error' />,
}));

vi.mock('@/features/kangur/ui/components/KangurAiTutorWidget', () => ({
  KangurAiTutorWidget: () => <div data-testid='kangur-ai-tutor-widget' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLoginModal', () => ({
  KangurLoginModal: () => <div data-testid='kangur-login-modal' />,
}));

vi.mock('@/features/kangur/ui/components/KangurRouteAccessibilityAnnouncer', () => ({
  KangurRouteAccessibilityAnnouncer: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurTopNavigationContext', () => ({
  KangurTopNavigationHost: () => null,
  KangurTopNavigationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurTutorAnchorContext', () => ({
  KangurTutorAnchorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  KangurLoginModalProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurProgressSyncProvider', () => ({
  KangurProgressSyncProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurScoreSyncProvider', () => ({
  KangurScoreSyncProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  KangurAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useKangurAuth: () => authStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => routingStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  KangurRouteTransitionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useKangurRouteTransition: () => routeTransitionStateMock(),
  useKangurRouteTransitionState: () => routeTransitionStateMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => routeNavigatorMock,
}));

vi.mock('@/features/kangur/config/pages', () => ({
  KANGUR_MAIN_PAGE: 'Game',
  kangurPages: {
    Game: () => <div data-testid='kangur-page-game'>Game</div>,
    Lessons: () => <div data-testid='kangur-page-lessons'>Lessons</div>,
    Tests: () => <div data-testid='kangur-page-tests'>Tests</div>,
  },
}));

vi.mock('@/features/kangur/config/routing', () => ({
  resolveKangurPageKey: (
    pageKey: string | null | undefined,
    pages: Record<string, React.ComponentType>,
    fallbackPageKey: string
  ) => (pageKey && pages[pageKey] ? pageKey : fallbackPageKey),
  getKangurHomeHref: (basePath = '/kangur') => basePath,
}));

vi.mock('@/features/kangur/cms-builder/KangurCmsRuntimeScreen', () => ({
  KangurCmsRuntimeScreen: ({ fallback }: { fallback: ReactNode }) => <>{fallback}</>,
}));

let KangurFeatureApp: typeof import('@/features/kangur/ui/KangurFeatureApp').KangurFeatureApp;

describe('KangurFeatureApp', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();

    authStateMock.mockReturnValue({
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: true,
    });
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
      isRouteRevealing: false,
      transitionPhase: 'idle',
      activeTransitionSourceId: null,
      activeTransitionPageKey: null,
      activeTransitionRequestedHref: null,
      activeTransitionSkeletonVariant: null,
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    ({ KangurFeatureApp } = await import('@/features/kangur/ui/KangurFeatureApp'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the resolved Kangur page content once auth is ready', () => {
    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-lessons')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
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
      vi.advanceTimersByTime(140);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Game:game-home'
    );
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
    expect(screen.getByTestId('kangur-route-content')).toHaveClass('pointer-events-none', 'opacity-0');
  });

  it('keeps the navigation skeleton visible through reveal after the destination becomes ready', async () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Tests',
      activeTransitionRequestedHref: '/kangur/tests',
      activeTransitionSkeletonVariant: 'tests',
      pendingPageKey: 'Tests',
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    const { rerender } = render(<KangurFeatureApp />);

    await act(async () => {
      vi.advanceTimersByTime(140);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Tests:tests'
    );

    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: true,
      transitionPhase: 'revealing',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Tests',
      activeTransitionRequestedHref: '/kangur/tests',
      activeTransitionSkeletonVariant: 'tests',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });

    await act(async () => {
      rerender(<KangurFeatureApp />);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Tests:tests'
    );
  });

  it('keeps the old page visible during the button acknowledgement phase', () => {
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

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
  });

  it('shows the page skeleton immediately once a button-led route handoff becomes pending', () => {
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

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Lessons:lessons-library'
    );
  });

  it('keeps the global app loader for boot loading states', () => {
    authStateMock.mockReturnValue({
      isLoadingAuth: true,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: true,
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      basePath: '/kangur',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-app-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
  });

  it('redirects anonymous users away from the parent dashboard route', async () => {
    authStateMock.mockReturnValue({
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: false,
    });
    routingStateMock.mockReturnValue({
      pageKey: 'ParentDashboard',
      embedded: false,
      requestedPath: '/parent-dashboard',
      basePath: '/',
    });

    render(<KangurFeatureApp />);

    await waitFor(() => {
      expect(routeNavigatorMock.replace).toHaveBeenCalledWith('/', {
        pageKey: 'Game',
        sourceId: 'kangur-auth:redirect-parent-dashboard',
      });
    });
  });
});
