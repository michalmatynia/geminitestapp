/**
 * @vitest-environment jsdom
 */

import React, { type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { KangurFeatureApp } from '@/features/kangur/ui/KangurFeatureApp';

describe('KangurFeatureApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
      isRoutePending: false,
      pendingPageKey: null,
      startRouteTransition: vi.fn(),
    });
  });

  it('keeps fast Kangur route transitions on the page surface without showing the blocking navigation skeleton', () => {
    routeTransitionStateMock.mockReturnValue({
      isRoutePending: true,
      pendingPageKey: 'Game',
      startRouteTransition: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.queryByTestId('kangur-page-transition-skeleton')).toBeNull();
    expect(screen.getByTestId('kangur-page-lessons')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute(
      'data-route-transition-key',
      '/kangur/lessons'
    );
  });

  it('still renders the boot skeleton while the Kangur app is loading', () => {
    authStateMock.mockReturnValue({
      isLoadingAuth: true,
      isLoadingPublicSettings: false,
      authError: null,
      navigateToLogin: vi.fn(),
    });

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-transition-skeleton')).toHaveTextContent('Lessons');
  });
});
