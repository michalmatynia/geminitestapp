/**
 * @vitest-environment jsdom
 */

import React, { type ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLatchedKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

const {
  authStateMock,
  loginModalStateMock,
  pendingRouteLoadingSnapshotMock,
  routingStateMock,
  routeTransitionStateMock,
  routeNavigatorMock,
  sessionMock,
  settingsStoreStateMock,
  topNavigationHostVisibleMock,
} = vi.hoisted(() => ({
  authStateMock: vi.fn(),
  loginModalStateMock: vi.fn(),
  pendingRouteLoadingSnapshotMock: vi.fn(),
  routingStateMock: vi.fn(),
  routeTransitionStateMock: vi.fn(),
  routeNavigatorMock: {
    back: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  },
  sessionMock: vi.fn(),
  settingsStoreStateMock: vi.fn(),
  topNavigationHostVisibleMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: (loader: unknown) => {
    const signature = typeof loader === 'function' ? loader.toString() : '';

    if (signature.includes('KangurAiTutorWidget')) {
      return () => <div data-testid='kangur-ai-tutor-widget' />;
    }

    if (signature.includes('KangurLoginModal')) {
      return () => <div data-testid='kangur-login-modal' />;
    }

    if (signature.includes('PageNotFound')) {
      return () => <div data-testid='kangur-page-not-found' />;
    }

    if (signature.includes('UserNotRegisteredError')) {
      return () => <div data-testid='kangur-user-not-registered-error' />;
    }

    return () => null;
  },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
}));

vi.mock('@/features/kangur/ui/components/KangurPageTransitionSkeleton', () => ({
  KangurPageTransitionSkeleton: ({
    embeddedOverride,
    pageKey,
    renderInlineTopNavigationSkeleton,
    topBarHeightCssValue,
    variant,
  }: {
    embeddedOverride?: boolean | null;
    pageKey?: string | null;
    renderInlineTopNavigationSkeleton?: boolean;
    topBarHeightCssValue?: string | null;
    variant?: string | null;
  }) => (
    <div
      data-embedded-override={
        typeof embeddedOverride === 'boolean' ? String(embeddedOverride) : ''
      }
      data-inline-top-navigation-skeleton={renderInlineTopNavigationSkeleton ? 'true' : 'false'}
      data-top-bar-height={topBarHeightCssValue ?? ''}
      data-testid='kangur-page-transition-skeleton'
    >
      {renderInlineTopNavigationSkeleton ? (
        <div data-testid='kangur-page-transition-skeleton-inline-top-navigation' />
      ) : null}
      {pageKey ?? 'none'}:{variant ?? 'default'}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurAppLoader', () => ({
  KangurAppLoader: ({
    offsetTopBar,
    visible,
  }: {
    offsetTopBar?: boolean;
    visible: boolean;
  }) =>
    visible ? (
      <div
        data-loader-offset-top-bar={offsetTopBar ? 'true' : 'false'}
        data-testid='kangur-app-loader'
      />
    ) : null,
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
  KangurTopNavigationHost: ({ fallback }: { fallback?: ReactNode }) =>
    topNavigationHostVisibleMock() ? (
      <div data-testid='kangur-top-navigation-host' />
    ) : (
      <>{fallback ?? null}</>
    ),
  KangurTopNavigationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurTutorAnchorContext', () => ({
  KangurTutorAnchorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  KangurLoginModalProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useKangurLoginModalState: () => loginModalStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  KangurAiTutorDeferredProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
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
  useKangurAuthState: () => authStateMock(),
  useKangurAuthActions: () => ({
    logout: vi.fn(),
    navigateToLogin: vi.fn(),
    checkAppState: vi.fn(),
    selectLearner: vi.fn(),
  }),
  useOptionalKangurAuth: () => authStateMock(),
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

vi.mock('@/features/kangur/ui/routing/pending-route-loading-snapshot', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/ui/routing/pending-route-loading-snapshot')>();
  return {
    ...actual,
    useKangurPendingRouteLoadingSnapshot: () => pendingRouteLoadingSnapshotMock(),
    resolveAccessibleKangurPendingRouteLoadingSnapshot:
      actual.resolveAccessibleKangurPendingRouteLoadingSnapshot,
  };
});

vi.mock('@/features/kangur/config/pages', () => ({
  KANGUR_MAIN_PAGE: 'Game',
  kangurPages: {
    Game: () => <div data-testid='kangur-page-game'>Game</div>,
    GamesLibrary: () => <div data-testid='kangur-page-games-library'>GamesLibrary</div>,
    Lessons: () => <div data-testid='kangur-page-lessons'>Lessons</div>,
    ParentDashboard: () => (
      <div data-testid='kangur-page-parent-dashboard'>ParentDashboard</div>
    ),
  },
}));

vi.mock('@/features/kangur/config/routing', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/config/routing')>();

  return {
    ...actual,
    normalizeKangurBasePath: (basePath: string | null | undefined) => {
      if (typeof basePath !== 'string') {
        return '/kangur';
      }

      const trimmed = basePath.trim();
      return trimmed.length > 0 ? trimmed : '/kangur';
    },
    resolveKangurPageKey: (
      pageKey: string | null | undefined,
      pages: Record<string, React.ComponentType>,
      fallbackPageKey: string
    ) => (pageKey && pages[pageKey] ? pageKey : fallbackPageKey),
    getKangurHomeHref: (basePath = '/kangur') => basePath,
  };
});

vi.mock('@/features/kangur/cms-builder/KangurCmsRuntimeScreen', () => ({
  KangurCmsRuntimeScreen: ({ fallback }: { fallback: ReactNode }) => <>{fallback}</>,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreStateMock(),
}));

let KangurFeatureApp: typeof import('@/features/kangur/ui/KangurFeatureApp').KangurFeatureApp;

describe('KangurFeatureApp', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
    clearLatchedKangurTopBarHeightCssValue();
    document.documentElement.style.removeProperty('--kangur-top-bar-height');
    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: false,
      isFetching: false,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });

    authStateMock.mockReturnValue({
      hasResolvedAuth: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
      isAuthenticated: true,
    });
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    routingStateMock.mockReturnValue({
      pageKey: 'Lessons',
      embedded: false,
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur/lessons',
      basePath: '/kangur',
    });
    loginModalStateMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      homeHref: '/kangur',
      isOpen: false,
      isRouteDriven: false,
      showParentAuthModeTabs: true,
    });
    pendingRouteLoadingSnapshotMock.mockReturnValue(null);
    routeTransitionStateMock.mockReturnValue({
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteWaitingForReady: false,
      isRouteRevealing: false,
      transitionPhase: 'idle',
      activeTransitionSourceId: null,
      activeTransitionKind: null,
      activeTransitionPageKey: null,
      activeTransitionRequestedHref: null,
      activeTransitionSkeletonVariant: null,
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
      markRouteTransitionReady: vi.fn(),
    });
    topNavigationHostVisibleMock.mockReturnValue(true);

    ({ KangurFeatureApp } = await import('@/features/kangur/ui/KangurFeatureApp'));
  });

  afterEach(() => {
    cleanup();
    clearLatchedKangurTopBarHeightCssValue();
    document.documentElement.style.removeProperty('--kangur-top-bar-height');
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the resolved Kangur page content once auth is ready', () => {
    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-top-navigation-host')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-lessons')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
    expect(screen.queryByTestId('kangur-login-modal')).toBeNull();
  });

  it('hides the Games library route behind a 404 for non-super-admin sessions', () => {
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
      pageKey: 'GamesLibrary',
      embedded: false,
      requestedPath: '/kangur/games',
      requestedHref: '/kangur/games',
      basePath: '/kangur',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-page-games-library')).toBeNull();
  });

  it('renders the Games library route for super-admin sessions', () => {
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
  });

  it('downgrades blocked GamesLibrary pending snapshots to the game-home skeleton for non-super-admin users', () => {
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
    pendingRouteLoadingSnapshotMock.mockReturnValue({
      fromHref: '/kangur',
      href: '/kangur/games',
      pageKey: 'GamesLibrary',
      skeletonVariant: 'lessons-library',
      startedAt: Date.now(),
      topBarHeightCssValue: '136px',
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent(
      'Game:game-home'
    );
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute('aria-hidden', 'true');
  });

  it('moves the navbar skeleton inline into the pending route skeleton while the shared host is unresolved', async () => {
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

  it('shows the page skeleton immediately during the language-switch acknowledgement phase', () => {
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
    expect(screen.queryByTestId('kangur-top-navigation-skeleton')).toBeNull();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveAttribute(
      'data-inline-top-navigation-skeleton',
      'true'
    );
    expect(screen.getByTestId('kangur-page-transition-skeleton-inline-top-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Lessons:lessons-library');
    expect(screen.getByTestId('kangur-route-content')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('kangur-route-content')).not.toHaveClass('opacity-0');
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

  it('keeps core routes visible during boot loading states', () => {
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

    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
  });

  it('redirects anonymous users away from the parent dashboard route', async () => {
    authStateMock.mockReturnValue({
      hasResolvedAuth: true,
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

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(routeNavigatorMock.replace).toHaveBeenCalledWith('/', {
      pageKey: 'Game',
      sourceId: 'kangur-auth:redirect-parent-dashboard',
    });
  });

  it('does not redirect away from the parent dashboard while auth is still unresolved', async () => {
    authStateMock.mockReturnValue({
      hasResolvedAuth: false,
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

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(routeNavigatorMock.replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
  });

  it('does not render the app loader over visible route content during theme loading', () => {
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

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.queryByTestId('kangur-top-navigation-skeleton')).toBeNull();
    expect(screen.getByTestId('kangur-top-navigation-host')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-lessons')).toBeInTheDocument();
  });

  it('renders the navbar skeleton instead of the app loader when top navigation is still unregistered during theme loading', () => {
    topNavigationHostVisibleMock.mockReturnValue(false);
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

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-top-navigation-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-top-navigation-host')).toBeNull();
    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
  });

  it('keeps the navbar skeleton mounted for standalone routes even when route content is temporarily null', async () => {
    topNavigationHostVisibleMock.mockReturnValue(false);
    authStateMock.mockReturnValue({
      hasResolvedAuth: true,
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

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('kangur-top-navigation-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-route-content')).toBeNull();
  });

  it('keeps route content visible while cached theme settings are refreshing', () => {
    routingStateMock.mockReturnValue({
      pageKey: 'Game',
      embedded: false,
      requestedPath: '/kangur',
      basePath: '/kangur',
    });

    settingsStoreStateMock.mockReturnValue({
      map: new Map(),
      isLoading: false,
      isFetching: true,
      error: null,
      get: vi.fn(),
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-app-loader')).toBeNull();
    expect(screen.getByTestId('kangur-route-content')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-page-game')).toBeInTheDocument();
  });
});
