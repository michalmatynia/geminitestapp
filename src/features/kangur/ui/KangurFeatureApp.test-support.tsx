/**
 * @vitest-environment jsdom
 */

import React, { type ReactNode } from 'react';
import { vi } from 'vitest';
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
  preloadKangurPageMock,
} = vi.hoisted(() => ({
  authStateMock: vi.fn(),
  loginModalStateMock: vi.fn(),
  pendingRouteLoadingSnapshotMock: vi.fn(),
  preloadKangurPageMock: vi.fn(),
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

const serializeMotionProp = (value: unknown): string | undefined =>
  value === undefined ? undefined : JSON.stringify(value);

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

vi.mock('@/features/kangur/cms-builder/KangurCmsRuntimeScreen', () => ({
  KangurCmsRuntimeScreen: ({ fallback }: { fallback: ReactNode }) => <>{fallback}</>,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreStateMock(),
}));

export {
  authStateMock,
  loginModalStateMock,
  pendingRouteLoadingSnapshotMock,
  preloadKangurPageMock,
  routingStateMock,
  routeNavigatorMock,
  routeTransitionStateMock,
  sessionMock,
  settingsStoreStateMock,
  topNavigationHostVisibleMock,
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
    startRouteTransition: vi.fn(),
    markRouteTransitionReady: vi.fn(),
  });
  topNavigationHostVisibleMock.mockReturnValue(true);
  preloadKangurPageMock.mockReset();

  const { KangurFeatureApp } = await import('@/features/kangur/ui/KangurFeatureApp');
  return KangurFeatureApp;
}
