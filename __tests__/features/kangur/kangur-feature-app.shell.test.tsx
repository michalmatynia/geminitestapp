import { render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurAuthMock, useKangurRoutingMock, resolveKangurPageKeyMock } = vi.hoisted(() => ({
  useKangurAuthMock: vi.fn(),
  useKangurRoutingMock: vi.fn(),
  resolveKangurPageKeyMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  KangurAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurProgressSyncProvider', () => ({
  KangurProgressSyncProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurTutorAnchorContext', () => ({
  KangurTutorAnchorProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/components/KangurAiTutorWidget', () => ({
  KangurAiTutorWidget: () => null,
}));

vi.mock('@/features/kangur/config/routing', async () => {
  const actual = await vi.importActual<typeof import('@/features/kangur/config/routing')>(
    '@/features/kangur/config/routing'
  );

  return {
    ...actual,
    KANGUR_MAIN_PAGE_KEY: 'Game',
    resolveKangurPageKey: resolveKangurPageKeyMock,
  };
});

vi.mock('@/features/kangur/config/pages', () => ({
  KANGUR_MAIN_PAGE: 'Game',
  kangurPages: {
    Game: () => <div data-testid='kangur-game-page'>Game page</div>,
    LearnerProfile: () => <div data-testid='kangur-profile-page'>Profile page</div>,
    Lessons: () => <div data-testid='kangur-lessons-page'>Lessons page</div>,
  },
}));

vi.mock('@/features/kangur/ui/components/PageNotFound', () => ({
  PageNotFound: () => <div data-testid='kangur-page-not-found'>Not found</div>,
}));

vi.mock('@/features/kangur/ui/components/UserNotRegisteredError', () => ({
  default: () => <div data-testid='kangur-user-not-registered'>User not registered</div>,
}));

vi.mock('@/features/kangur/cms-builder/KangurCmsRuntimeScreen', () => ({
  KangurCmsRuntimeScreen: ({ fallback }: { fallback: ReactNode }) => <>{fallback}</>,
}));

import { KangurFeatureApp } from '@/features/kangur/ui/KangurFeatureApp';

const buildAuthState = (overrides: Record<string, unknown> = {}) => ({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  appPublicSettings: null,
  logout: vi.fn(),
  navigateToLogin: vi.fn(),
  checkAppState: vi.fn(),
  ...overrides,
});

describe('KangurFeatureApp shell behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurRoutingMock.mockReturnValue({ pageKey: 'Game', requestedPath: '/kangur/game' });
    resolveKangurPageKeyMock.mockReturnValue('Game');
    useKangurAuthMock.mockReturnValue(buildAuthState());
  });

  it('renders a full-screen Kangur loading shell while auth state is loading', () => {
    useKangurAuthMock.mockReturnValue(
      buildAuthState({
        isLoadingAuth: true,
      })
    );

    const { container } = render(<KangurFeatureApp />);
    const loadingShell = container.firstElementChild as HTMLElement | null;

    expect(loadingShell).not.toBeNull();
    expect(loadingShell).toHaveClass('fixed', 'inset-0', 'flex', 'items-center', 'justify-center');

    const spinner = loadingShell?.querySelector('div');
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveClass(
      'w-8',
      'h-8',
      'border-4',
      'border-slate-200',
      'border-t-slate-800',
      'rounded-full',
      'animate-spin'
    );
  });

  it('navigates to login and renders nothing when auth is required', () => {
    const navigateToLogin = vi.fn();
    useKangurAuthMock.mockReturnValue(
      buildAuthState({
        authError: {
          type: 'auth_required',
          message: 'Authentication required',
        },
        navigateToLogin,
      })
    );

    render(<KangurFeatureApp />);

    expect(navigateToLogin).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('kangur-route-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-game-page')).not.toBeInTheDocument();
  });

  it('renders the user-not-registered state for missing Kangur enrollment', () => {
    useKangurAuthMock.mockReturnValue(
      buildAuthState({
        authError: {
          type: 'user_not_registered',
          message: 'User is not registered in Kangur',
        },
      })
    );

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-user-not-registered')).toBeInTheDocument();
  });

  it('renders PageNotFound when requested page cannot be resolved', () => {
    useKangurRoutingMock.mockReturnValue({
      pageKey: 'unknown-page',
      requestedPath: '/kangur/unknown-page',
    });
    resolveKangurPageKeyMock.mockReturnValue(null);

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-page-not-found')).toBeInTheDocument();
  });

  it('renders the resolved Kangur page component for known routes', () => {
    useKangurRoutingMock.mockReturnValue({
      pageKey: 'lessons',
      requestedPath: '/kangur/lessons',
    });
    resolveKangurPageKeyMock.mockReturnValue('Lessons');

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-lessons-page')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute(
      'data-route-transition-key',
      '/kangur/lessons'
    );
  });

  it('renders learner profile shell when route resolves to LearnerProfile', () => {
    useKangurRoutingMock.mockReturnValue({
      pageKey: 'profile',
      requestedPath: '/kangur/profile',
    });
    resolveKangurPageKeyMock.mockReturnValue('LearnerProfile');

    render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-profile-page')).toBeInTheDocument();
  });

  it('replays the content transition when the requested path changes', async () => {
    useKangurRoutingMock.mockReturnValue({
      pageKey: 'game',
      requestedPath: '/kangur/game',
    });
    resolveKangurPageKeyMock.mockReturnValue('Game');

    const { rerender } = render(<KangurFeatureApp />);

    expect(screen.getByTestId('kangur-route-content')).toHaveAttribute(
      'data-route-transition-key',
      '/kangur/game'
    );

    useKangurRoutingMock.mockReturnValue({
      pageKey: 'lessons',
      requestedPath: '/kangur/lessons',
    });
    resolveKangurPageKeyMock.mockReturnValue('Lessons');

    rerender(<KangurFeatureApp />);

    await waitFor(() => {
      expect(screen.getByTestId('kangur-route-content')).toHaveAttribute(
        'data-route-transition-key',
        '/kangur/lessons'
      );
    });
  });
});
