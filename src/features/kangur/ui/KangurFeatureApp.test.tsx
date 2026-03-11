/**
 * @vitest-environment jsdom
 */

import React, { type ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authStateMock,
  routingStateMock,
  routeTransitionStateMock,
} = vi.hoisted(() => ({
  authStateMock: vi.fn(),
  routingStateMock: vi.fn(),
  routeTransitionStateMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

vi.mock('@/features/kangur/ui/components/KangurPageTransitionSkeleton', () => ({
  KangurPageTransitionSkeleton: ({ pageKey }: { pageKey?: string | null }) => (
    <div data-testid='kangur-page-transition-skeleton'>{pageKey ?? 'none'}</div>
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
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Lessons',
      embedded: false,
      requestedPath: '/kangur/lessons',
    });
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteRevealing: false,
      transitionPhase: 'idle',
      activeTransitionSourceId: null,
      activeTransitionPageKey: null,
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
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
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Game',
      pendingPageKey: 'Game',
      startRouteTransition: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(140);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Game');
  });

  it('does not flash the navigation skeleton for fast route transitions', async () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Lessons',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
    });

    const { rerender } = render(<KangurFeatureApp />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteRevealing: true,
      transitionPhase: 'revealing',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Lessons',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
    });

    await act(async () => {
      rerender(<KangurFeatureApp />);
    });

    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
  });

  it('keeps the navigation skeleton visible through reveal after a slow route transition', async () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Tests',
      pendingPageKey: 'Tests',
      startRouteTransition: vi.fn(),
    });

    const { rerender } = render(<KangurFeatureApp />);

    await act(async () => {
      vi.advanceTimersByTime(140);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Tests');

    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteRevealing: true,
      transitionPhase: 'revealing',
      activeTransitionSourceId: null,
      activeTransitionPageKey: 'Tests',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
    });

    await act(async () => {
      rerender(<KangurFeatureApp />);
    });

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Tests');
  });

  it('keeps the old page visible during the button acknowledgement phase', () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: true,
      isRoutePending: false,
      isRouteRevealing: false,
      transitionPhase: 'acknowledging',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
  });

  it('shows the page skeleton immediately once a button-led route handoff becomes pending', () => {
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteRevealing: false,
      transitionPhase: 'pending',
      activeTransitionSourceId: 'game-home-action:lessons',
      activeTransitionPageKey: 'Lessons',
      pendingPageKey: 'Lessons',
      startRouteTransition: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Lessons');
  });

  it('keeps the global app loader for boot loading states', () => {
    authStateMock.mockReturnValue({
      isLoadingAuth: true,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-app-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
  });
});
