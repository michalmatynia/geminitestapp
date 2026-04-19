'use client';

/**
 * @vitest-environment jsdom
 */

import React, { type ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';
import { clearLatchedKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

type MockedSessionState = {
  data: unknown;
  status: 'authenticated' | 'loading' | 'unauthenticated';
};

type MockedLoginModalState = ReturnType<
  typeof import('@/features/kangur/ui/context/KangurLoginModalContext')['useKangurLoginModalState']
>;
type MockedAuthState = ReturnType<
  typeof import('@/features/kangur/ui/context/KangurAuthContext')['useKangurAuth']
>;
type MockedRoutingState = ReturnType<
  typeof import('@/features/kangur/ui/context/KangurRoutingContext')['useKangurRouting']
>;
type MockedRouteTransitionState = ReturnType<
  typeof import('@/features/kangur/ui/context/KangurRouteTransitionContext')['useKangurRouteTransitionState']
>;
type MockedRouteTransitionStateInput = MockedRouteTransitionState & {
  markRouteTransitionReady?: ReturnType<typeof vi.fn>;
  startRouteTransition?: ReturnType<typeof vi.fn>;
};
type MockedPendingRouteLoadingSnapshot = ReturnType<
  typeof import('@/features/kangur/ui/routing/pending-route-loading-snapshot')['useKangurPendingRouteLoadingSnapshot']
>;
type MockedSettingsStore = ReturnType<
  typeof import('@/shared/providers/SettingsStoreProvider')['useSettingsStore']
>;
type MockedAuthStateInput = Partial<MockedAuthState> &
  Pick<
    MockedAuthState,
    | 'authError'
    | 'hasResolvedAuth'
    | 'isAuthenticated'
    | 'isLoadingAuth'
    | 'isLoadingPublicSettings'
  >;
type MockedQueryClient = Pick<QueryClient, 'prefetchQuery'>;

const {
  authStateMock,
  loginModalStateMock,
  pendingRouteLoadingSnapshotMock,
  prefetchKangurPageContentStoreMock,
  routingStateMock,
  routeTransitionStateMock,
  routeNavigatorMock,
  queryClientMock,
  sessionMock,
  settingsStoreStateMock,
  topNavigationHostVisibleMock,
  useKangurCoarsePointerMock,
  preloadKangurPageMock,
  useLocaleMock,
} = vi.hoisted(() => ({
  authStateMock: vi.fn<() => MockedAuthStateInput>(),
  loginModalStateMock: vi.fn<() => MockedLoginModalState>(),
  pendingRouteLoadingSnapshotMock: vi.fn<() => MockedPendingRouteLoadingSnapshot>(),
  preloadKangurPageMock: vi.fn<(pageKey: string) => void>(),
  prefetchKangurPageContentStoreMock: vi.fn<
    (queryClient: QueryClient | null | undefined, locale?: string | null) => Promise<boolean>
  >(),
  queryClientMock: vi.fn<() => MockedQueryClient>(),
  routingStateMock: vi.fn<() => MockedRoutingState>(),
  routeTransitionStateMock: vi.fn<() => MockedRouteTransitionStateInput>(),
  routeNavigatorMock: {
    back: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  },
  sessionMock: vi.fn<() => MockedSessionState>(),
  settingsStoreStateMock: vi.fn<() => MockedSettingsStore>(),
  topNavigationHostVisibleMock: vi.fn(),
  useKangurCoarsePointerMock: vi.fn<() => boolean>(),
  useLocaleMock: vi.fn<() => string>(),
}));

const serializeMotionProp = (value: unknown): string | undefined =>
  value === undefined ? undefined : JSON.stringify(value);

const createMockedAuthState = (
  overrides: MockedAuthStateInput = {
    authError: null,
    hasResolvedAuth: true,
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
  },
): MockedAuthState => {
  const defaults: MockedAuthState = {
    user: null,
    isAuthenticated: true,
    hasResolvedAuth: true,
    canAccessParentAssignments: false,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authError: null,
    appPublicSettings: null,
    logout: vi.fn(),
    navigateToLogin: vi.fn(),
    checkAppState: vi.fn(async () => null),
    selectLearner: vi.fn(async () => undefined),
  };

  return {
    ...defaults,
    ...overrides,
  };
};

const createMockedRouteTransitionState = (
  overrides: MockedRouteTransitionStateInput = {
    activeTransitionKind: null,
    activeTransitionPageKey: null,
    activeTransitionRequestedHref: null,
    activeTransitionSkeletonVariant: null,
    activeTransitionSourceId: null,
    isRouteAcknowledging: false,
    isRoutePending: false,
    isRouteRevealing: false,
    isRouteWaitingForReady: false,
    pendingPageKey: null,
    transitionPhase: 'idle',
  },
): MockedRouteTransitionState => {
  const defaults: MockedRouteTransitionState = {
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
  };

  return {
    ...defaults,
    ...overrides,
  };
};

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

vi.mock('@/features/kangur/ui/components/LazyAnimatePresence', () => ({
  LazyAnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  LazyMotionDiv: ({
    animate,
    children,
    exit,
    initial,
    transition,
    ...props
  }: React.ComponentProps<'div'> & {
    animate?: unknown;
    exit?: unknown;
    initial?: unknown;
    transition?: unknown;
  }) => (
    <div
      data-motion-animate={serializeMotionProp(animate)}
      data-motion-exit={serializeMotionProp(exit)}
      data-motion-initial={serializeMotionProp(initial)}
      data-motion-transition={serializeMotionProp(transition)}
      {...props}
    >
      {children}
    </div>
  ),
  usePrefersReducedMotion: () => false,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      animate,
      children,
      exit,
      initial,
      transition,
      ...props
    }: React.ComponentProps<'div'> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => (
      <div
        data-motion-animate={serializeMotionProp(animate)}
        data-motion-exit={serializeMotionProp(exit)}
        data-motion-initial={serializeMotionProp(initial)}
        data-motion-transition={serializeMotionProp(transition)}
        {...props}
      >
        {children}
      </div>
    ),
  },
  useReducedMotion: () => false,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => useLocaleMock(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => queryClientMock() as QueryClient,
  };
});

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

vi.mock('@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget', () => ({
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
  useKangurLoginModalActions: () => ({
    closeLoginModal: vi.fn(),
    dismissLoginModal: vi.fn(),
    openLoginModal: vi.fn(),
  }),
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
  useKangurAuth: () => createMockedAuthState(authStateMock()),
  useKangurAuthSessionState: () => {
    const authState = createMockedAuthState(authStateMock());
    return {
      user: authState.user,
      isAuthenticated: authState.isAuthenticated,
      hasResolvedAuth: authState.hasResolvedAuth,
      canAccessParentAssignments: authState.canAccessParentAssignments,
    };
  },
  useKangurAuthStatusState: () => {
    const authState = createMockedAuthState(authStateMock());
    return {
      isLoadingAuth: authState.isLoadingAuth,
      isLoadingPublicSettings: authState.isLoadingPublicSettings,
      isLoggingOut: false,
      authError: authState.authError,
      appPublicSettings: authState.appPublicSettings,
    };
  },
  useKangurAuthState: () => createMockedAuthState(authStateMock()),
  useKangurAuthActions: () => ({
    logout: vi.fn(),
    navigateToLogin: vi.fn(),
    checkAppState: vi.fn(),
    selectLearner: vi.fn(),
  }),
  useOptionalKangurAuth: () => createMockedAuthState(authStateMock()),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => routingStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  KangurRouteTransitionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useKangurRouteTransition: () => createMockedRouteTransitionState(routeTransitionStateMock()),
  useKangurRouteTransitionState: () =>
    createMockedRouteTransitionState(routeTransitionStateMock()),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => routeNavigatorMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => useKangurCoarsePointerMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  prefetchKangurPageContentStore: (
    ...args: Parameters<typeof prefetchKangurPageContentStoreMock>
  ) => prefetchKangurPageContentStoreMock(...args),
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
  preloadKangurPage: (pageKey: string) => preloadKangurPageMock(pageKey),
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
      fallbackPageKey: string,
    ) => (pageKey && pages[pageKey] ? pageKey : fallbackPageKey),
    getKangurHomeHref: (basePath = '/kangur') => basePath,
  };
});

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreStateMock(),
}));

export {
  authStateMock,
  loginModalStateMock,
  pendingRouteLoadingSnapshotMock,
  preloadKangurPageMock,
  prefetchKangurPageContentStoreMock,
  queryClientMock,
  routingStateMock,
  routeNavigatorMock,
  routeTransitionStateMock,
  sessionMock,
  settingsStoreStateMock,
  topNavigationHostVisibleMock,
  useKangurCoarsePointerMock,
  useLocaleMock,
};

export async function setupKangurFeatureAppTest() {
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
  });
  topNavigationHostVisibleMock.mockReturnValue(true);
  useKangurCoarsePointerMock.mockReturnValue(false);
  preloadKangurPageMock.mockReset();
  prefetchKangurPageContentStoreMock.mockReset();
  prefetchKangurPageContentStoreMock.mockResolvedValue(true);
  queryClientMock.mockReturnValue({
    prefetchQuery: vi.fn() as QueryClient['prefetchQuery'],
  });
  useLocaleMock.mockReturnValue('pl');

  const { KangurFeatureApp } = await import('@/features/kangur/ui/KangurFeatureApp');
  return KangurFeatureApp;
}
