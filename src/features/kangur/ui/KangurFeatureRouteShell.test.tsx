import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLatchedKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

const {
  setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContextMock,
  withKangurClientError,
  withKangurClientErrorSync,
  usePathnameMock,
  useRouterReplaceMock,
  useSelectedLayoutSegmentsMock,
  useSearchParamsMock,
  sessionMock,
} = vi.hoisted(() => {
  const mocks = globalThis.__kangurClientErrorMocks();
  return {
    setKangurClientObservabilityContextMock: mocks.setKangurClientObservabilityContextMock,
    clearKangurClientObservabilityContextMock: mocks.clearKangurClientObservabilityContextMock,
    withKangurClientError: mocks.withKangurClientError,
    withKangurClientErrorSync: mocks.withKangurClientErrorSync,
    usePathnameMock: vi.fn<() => string | null>(),
    useRouterReplaceMock: vi.fn(),
    useSelectedLayoutSegmentsMock: vi.fn<() => string[]>(),
    useSearchParamsMock: vi.fn<() => URLSearchParams>(),
    sessionMock: vi.fn(),
  };
});

const kangurRoutingProviderMock = vi.fn();

const mockKangurRoutingState = {
  pageKey: null as string | null,
  requestedPath: '/kangur',
  basePath: '/kangur',
  embedded: false,
};

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({
    replace: useRouterReplaceMock,
  }),
  useSelectedLayoutSegments: () => useSelectedLayoutSegmentsMock(),
  useSearchParams: () => useSearchParamsMock(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  setKangurClientObservabilityContext: setKangurClientObservabilityContextMock,
  clearKangurClientObservabilityContext: clearKangurClientObservabilityContextMock,
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', async () => {
  const routing = await vi.importActual<typeof import('@/features/kangur/config/routing')>(
    '@/features/kangur/config/routing'
  );
  const pageAccess = await vi.importActual<typeof import('@/features/kangur/config/page-access')>(
    '@/features/kangur/config/page-access'
  );
  const managedPaths = await vi.importActual<
    typeof import('@/features/kangur/ui/routing/managed-paths')
  >('@/features/kangur/ui/routing/managed-paths');

  return {
    KangurRoutingProvider: ({
      children,
      ...props
    }: {
      pageKey?: string | null;
      requestedPath?: string;
      requestedHref?: string;
      basePath: string;
      embedded: boolean;
      children: ReactNode;
    }) => {
      kangurRoutingProviderMock(props);
      const resolvedBasePath = routing.normalizeKangurBasePath(props.basePath);
      const normalizedRequestedPath = props.requestedPath?.trim() || resolvedBasePath;
      const accessibleRouteState = pageAccess.resolveAccessibleKangurRouteState({
        normalizedBasePath: resolvedBasePath,
        pageKey: props.pageKey,
        requestedPath: normalizedRequestedPath,
        session: sessionMock().data ?? null,
        slugSegments: managedPaths.getKangurSlugFromPathname(
          normalizedRequestedPath,
          resolvedBasePath
        ),
      });
      mockKangurRoutingState.pageKey = accessibleRouteState.pageKey ?? null;
      mockKangurRoutingState.requestedPath = accessibleRouteState.requestedPath;
      mockKangurRoutingState.basePath = resolvedBasePath;
      mockKangurRoutingState.embedded = props.embedded;
      return <div data-testid='kangur-routing-provider'>{children}</div>;
    },
    useKangurRoutingState: () => ({ ...mockKangurRoutingState }),
  };
});

vi.mock('@/features/kangur/ui/KangurFeatureApp', () => ({
  KangurFeatureApp: () => <div data-testid='kangur-feature-app'>Kangur feature app</div>,
}));

vi.mock(
  '@/features/kangur/ui/components/MultiplicationArrayGame',
  () => ({
    default: () => <div data-testid='multiplication-array-game'>Multiplication array game</div>,
  }),
  { virtual: true }
);

import { KangurFeatureRouteShell } from '@/features/kangur/ui/KangurFeatureRouteShell';

const originalLocation = window.location;

const KangurFeatureRouteShellWithoutPropsObject = () =>
  (
    KangurFeatureRouteShell as unknown as (props?: {
      basePath?: string;
      embedded?: boolean;
      forceBodyScrollLock?: boolean;
    }) => JSX.Element
  )(undefined);

describe('KangurFeatureRouteShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    clearLatchedKangurTopBarHeightCssValue();
    window.history.replaceState({}, '', '/kangur');
    document.documentElement.style.removeProperty('--kangur-top-bar-height');
    document.documentElement.classList.remove('kangur-client-shell-active');
    document.body.classList.remove('kangur-client-shell-active');
    usePathnameMock.mockReturnValue('/kangur');
    useSelectedLayoutSegmentsMock.mockReturnValue([]);
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useRouterReplaceMock.mockReset();
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0,
    });
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }));
  });

  it('marks the client shell active instead of removing the server shell overlay directly', () => {
    const serverShell = document.createElement('div');
    serverShell.setAttribute('data-kangur-server-shell', '');
    document.body.appendChild(serverShell);

    const { unmount } = render(<KangurFeatureRouteShell />);

    expect(document.documentElement.classList.contains('kangur-client-shell-active')).toBe(true);
    expect(document.body.classList.contains('kangur-client-shell-active')).toBe(true);
    expect(document.body.contains(serverShell)).toBe(true);

    unmount();

    expect(document.documentElement.classList.contains('kangur-client-shell-active')).toBe(false);
    expect(document.body.classList.contains('kangur-client-shell-active')).toBe(false);

    serverShell.remove();
  });

  it('maps lesson routes into Kangur routing and observability context', () => {
    usePathnameMock.mockReturnValue('/kangur/lessons');
    useSelectedLayoutSegmentsMock.mockReturnValue(['lessons']);

    render(<KangurFeatureRouteShell />);

    expect(screen.getByTestId('kangur-route-shell')).toHaveClass(
      'kangur-shell-viewport-height',
      'kangur-premium-bg'
    );
    expect(screen.getByTestId('kangur-route-shell').style.getPropertyValue('--kangur-top-bar-height')).toBe('');
    expect(screen.getByTestId('kangur-route-shell').style.background).toBe('');
    expect(screen.getByTestId('kangur-route-shell').style.color).toBe('');
    expect(screen.getByTestId('kangur-route-shell')).not.toHaveClass('text-slate-800');
    expect(screen.getByTestId('kangur-routing-provider')).toBeInTheDocument();
    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur/lessons',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
    });
  });

  it('maps learner profile routes into Kangur routing and observability context', () => {
    usePathnameMock.mockReturnValue('/kangur/profile');
    useSelectedLayoutSegmentsMock.mockReturnValue(['profile']);

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'LearnerProfile',
      requestedPath: '/kangur/profile',
      requestedHref: '/kangur/profile',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'LearnerProfile',
      requestedPath: '/kangur/profile',
    });
  });

  it('maps the tests slug while normalizing trailing slashes', () => {
    usePathnameMock.mockReturnValue('/kangur/tests/');
    useSelectedLayoutSegmentsMock.mockReturnValue(['tests']);

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/kangur/tests',
      requestedHref: '/kangur/tests',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Tests',
      requestedPath: '/kangur/tests',
    });
  });

  it('maps competition routes into Kangur routing', () => {
    usePathnameMock.mockReturnValue('/kangur/competition');
    useSelectedLayoutSegmentsMock.mockReturnValue(['competition']);

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Competition',
      requestedPath: '/kangur/competition',
      requestedHref: '/kangur/competition',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Competition',
      requestedPath: '/kangur/competition',
    });
  });

  it('maps localized public routes into canonical Kangur routing while preserving the localized href', () => {
    usePathnameMock.mockReturnValue('/en/lessons');
    useSelectedLayoutSegmentsMock.mockReturnValue([]);

    render(<KangurFeatureRouteShell basePath='/' />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/lessons',
      requestedHref: '/en/lessons',
      basePath: '/',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/lessons',
    });
  });

  it('falls back to the real browser pathname when the router pathname is transiently unavailable', () => {
    window.history.replaceState({}, '', '/en/lessons?focus=division');
    usePathnameMock.mockReturnValue(null);
    useSelectedLayoutSegmentsMock.mockReturnValue([]);
    useSearchParamsMock.mockReturnValue(new URLSearchParams());

    render(<KangurFeatureRouteShell basePath='/' />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/lessons',
      requestedHref: '/en/lessons?focus=division',
      basePath: '/',
      embedded: false,
    });
  });

  it('falls back to the main page for the base Kangur path', () => {
    useSelectedLayoutSegmentsMock.mockReturnValue([]);

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });
  });

  it('keeps the default base path when the shell is invoked without a props object', () => {
    useSelectedLayoutSegmentsMock.mockReturnValue([]);

    render(<KangurFeatureRouteShellWithoutPropsObject />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
      requestedHref: '/kangur',
      basePath: '/kangur',
      embedded: false,
    });
  });

  it('passes blocked GamesLibrary routes through to shared routing for provider-level sanitization', () => {
    usePathnameMock.mockReturnValue('/kangur/games');
    useSelectedLayoutSegmentsMock.mockReturnValue(['games']);
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'GamesLibrary',
      requestedPath: '/kangur/games',
      requestedHref: '/kangur/games',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });
  });

  it('uses the main page behind the compatibility login route so the shell can show the modal', () => {
    usePathnameMock.mockReturnValue('/kangur/login');
    useSelectedLayoutSegmentsMock.mockReturnValue([]);

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
      requestedHref: '/kangur/login',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/kangur',
    });
  });

  it('uses the main page behind the root-owned canonical login route so the shell can show the modal', () => {
    usePathnameMock.mockReturnValue('/login');
    useSelectedLayoutSegmentsMock.mockReturnValue([]);

    render(<KangurFeatureRouteShell basePath='/' />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/',
      requestedHref: '/login',
      basePath: '/',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Game',
      requestedPath: '/',
    });
  });

  it('strips launch-intent params from shared routing before the web shell takes over', () => {
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue('/kangur/lessons');
    useSelectedLayoutSegmentsMock.mockReturnValue(['lessons']);
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('focus=division&__kangurLaunch=dedicated_app')
    );
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur/lessons?focus=division',
      basePath: '/kangur',
      embedded: false,
    });
    expect(useRouterReplaceMock).toHaveBeenCalledWith('/kangur/lessons?focus=division', {
      scroll: false,
    });

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(screen.getByRole('button', { name: 'Open app' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay on web' })).toBeInTheDocument();
  });

  it('lets the learner dismiss the dedicated-app launch prompt and continue on web', () => {
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue('/kangur/lessons');
    useSelectedLayoutSegmentsMock.mockReturnValue(['lessons']);
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('focus=division&__kangurLaunch=dedicated_app')
    );
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    render(<KangurFeatureRouteShell />);

    act(() => {
      vi.advanceTimersByTime(160);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Stay on web' }));

    expect(screen.queryByRole('button', { name: 'Open app' })).toBeNull();
  });

  it('offers the dedicated-app prompt on root-owned canonical learner routes', () => {
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue('/lessons');
    useSelectedLayoutSegmentsMock.mockReturnValue([]);
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('focus=division&__kangurLaunch=dedicated_app')
    );
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    const locationAssignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: locationAssignMock,
        href: `${originalLocation.origin}/lessons?focus=division&__kangurLaunch=dedicated_app`,
        origin: originalLocation.origin,
        pathname: '/lessons',
        search: '?focus=division&__kangurLaunch=dedicated_app',
      },
      configurable: true,
      writable: true,
    });

    try {
      render(<KangurFeatureRouteShell basePath='/' />);

      expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
        pageKey: 'Lessons',
        requestedPath: '/lessons',
        requestedHref: '/lessons?focus=division',
        basePath: '/',
        embedded: false,
      });
      expect(useRouterReplaceMock).toHaveBeenCalledWith('/lessons?focus=division', {
        scroll: false,
      });

      act(() => {
        vi.advanceTimersByTime(160);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Open app' }));

      expect(locationAssignMock).toHaveBeenCalledWith('kangur://lessons?focus=division');
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('offers the dedicated-app prompt on localized canonical learner routes', () => {
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue('/en/lessons');
    useSelectedLayoutSegmentsMock.mockReturnValue([]);
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('focus=division&__kangurLaunch=dedicated_app')
    );
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    const locationAssignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: locationAssignMock,
        href: `${originalLocation.origin}/en/lessons?focus=division&__kangurLaunch=dedicated_app`,
        origin: originalLocation.origin,
        pathname: '/en/lessons',
        search: '?focus=division&__kangurLaunch=dedicated_app',
      },
      configurable: true,
      writable: true,
    });

    try {
      render(<KangurFeatureRouteShell basePath='/' />);

      expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
        pageKey: 'Lessons',
        requestedPath: '/lessons',
        requestedHref: '/en/lessons?focus=division',
        basePath: '/',
        embedded: false,
      });
      expect(useRouterReplaceMock).toHaveBeenCalledWith('/en/lessons?focus=division', {
        scroll: false,
      });

      act(() => {
        vi.advanceTimersByTime(160);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Open app' }));

      expect(locationAssignMock).toHaveBeenCalledWith('kangur://lessons?focus=division');
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('opens the dedicated app only after the learner confirms the launch prompt', () => {
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue('/kangur/lessons');
    useSelectedLayoutSegmentsMock.mockReturnValue(['lessons']);
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams('focus=division&__kangurLaunch=dedicated_app')
    );
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    const locationAssignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: {
        ...originalLocation,
        assign: locationAssignMock,
        href: `${originalLocation.origin}/kangur/lessons?focus=division`,
        origin: originalLocation.origin,
        pathname: '/kangur/lessons',
        search: '?focus=division',
      },
      configurable: true,
      writable: true,
    });

    try {
      render(<KangurFeatureRouteShell />);

      act(() => {
        vi.advanceTimersByTime(160);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Open app' }));

      expect(locationAssignMock).toHaveBeenCalledWith('kangur://lessons?focus=division');
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        configurable: true,
        writable: true,
      });
    }
  });

  it('keeps unsupported dedicated-app routes on the web shell without showing the app prompt', () => {
    vi.useFakeTimers();
    usePathnameMock.mockReturnValue('/kangur/games');
    useSelectedLayoutSegmentsMock.mockReturnValue(['games']);
    useSearchParamsMock.mockReturnValue(new URLSearchParams('__kangurLaunch=dedicated_app'));
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'GamesLibrary',
      requestedPath: '/kangur/games',
      requestedHref: '/kangur/games',
      basePath: '/kangur',
      embedded: false,
    });
    expect(useRouterReplaceMock).toHaveBeenCalledWith('/kangur/games', {
      scroll: false,
    });

    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(screen.queryByRole('button', { name: 'Open app' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Stay on web' })).toBeNull();
  });

  it('clears the client observability context on unmount', () => {
    const { unmount } = render(<KangurFeatureRouteShell />);

    unmount();

    expect(clearKangurClientObservabilityContextMock).toHaveBeenCalledTimes(1);
  });

  it('prefers the explicit selected layout segments over pathname parsing for hot alias routes', () => {
    usePathnameMock.mockReturnValue('/kangur');
    useSelectedLayoutSegmentsMock.mockReturnValue(['lessons']);

    render(<KangurFeatureRouteShell />);

    expect(kangurRoutingProviderMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
      requestedHref: '/kangur',
      basePath: '/kangur',
      embedded: false,
    });
    expect(setKangurClientObservabilityContextMock).toHaveBeenCalledWith({
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
    });
  });
});
