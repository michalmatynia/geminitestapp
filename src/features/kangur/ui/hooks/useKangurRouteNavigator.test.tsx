/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startRouteTransitionMock,
  frontendPublicOwnerMock,
  sessionMock,
  useOptionalKangurRouteTransitionStateMock,
  useOptionalKangurRoutingMock,
  usePathnameMock,
  useLocaleMock,
  routerPrefetchMock,
  routerPushMock,
  routerReplaceMock,
} = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
  frontendPublicOwnerMock: vi.fn(),
  sessionMock: vi.fn(),
  useOptionalKangurRouteTransitionStateMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useLocaleMock: vi.fn(),
  routerPrefetchMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: useLocaleMock,
}));

vi.mock('next-auth/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-auth/react')>();
  return {
    ...actual,
    useSession: () => sessionMock(),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({
    back: vi.fn(),
    prefetch: routerPrefetchMock,
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionActions: () => ({
    startRouteTransition: startRouteTransitionMock,
  }),
  useOptionalKangurRouteTransitionState: useOptionalKangurRouteTransitionStateMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  useOptionalFrontendPublicOwner: () => frontendPublicOwnerMock(),
}));

import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';

const NavigatorProbe = ({ href }: { href: string }): React.JSX.Element => {
  const routeNavigator = useKangurRouteNavigator();

  return (
    <button
      data-testid='navigator-replace'
      onClick={() => routeNavigator.replace(href)}
      type='button'
    >
      Replace
    </button>
  );
};

const NavigatorPushProbe = ({
  acknowledgeMs,
  href,
}: {
  acknowledgeMs: number;
  href: string;
}): React.JSX.Element => {
  const routeNavigator = useKangurRouteNavigator();

  return (
    <button
      data-testid='navigator-push'
      onClick={() => routeNavigator.push(href, { acknowledgeMs })}
      type='button'
    >
      Push
    </button>
  );
};

const NavigatorBackProbe = ({
  acknowledgeMs,
  fallbackHref,
  fallbackPageKey,
}: {
  acknowledgeMs?: number;
  fallbackHref?: string;
  fallbackPageKey?: string;
}): React.JSX.Element => {
  const routeNavigator = useKangurRouteNavigator();

  return (
    <button
      data-testid='navigator-back'
      onClick={() =>
        routeNavigator.back({
          acknowledgeMs,
          fallbackHref,
          fallbackPageKey,
          sourceId: 'lessons:list-back',
        })
      }
      type='button'
    >
      Back
    </button>
  );
};

describe('useKangurRouteNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0,
    });
    useLocaleMock.mockReturnValue('pl');
    usePathnameMock.mockReturnValue('/lessons');
    frontendPublicOwnerMock.mockReturnValue(null);
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    useOptionalKangurRouteTransitionStateMock.mockReturnValue(null);
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/',
      embedded: false,
      pageKey: 'Lessons',
      requestedHref: '/lessons',
      requestedPath: '/lessons',
    });
    startRouteTransitionMock.mockReturnValue({
      acknowledgeMs: 0,
      started: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves the correct page key from localized public routes', () => {
    render(<NavigatorProbe href='/en/lessons' />);

    fireEvent.click(screen.getByTestId('navigator-replace'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons',
      pageKey: 'Lessons',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/en/lessons', { scroll: false });
  });

  it('resolves localized Kangur alias routes against the /kangur base path', () => {
    usePathnameMock.mockReturnValue('/kangur');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedHref: '/kangur',
      requestedPath: '/kangur',
    });

    render(<NavigatorProbe href='/de/kangur/tests' />);

    fireEvent.click(screen.getByTestId('navigator-replace'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/de/kangur/tests',
      pageKey: 'Tests',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/de/kangur/tests', { scroll: false });
  });

  it('preserves the active locale prefix when navigating from a localized Kangur route', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/kangur');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedHref: '/en/kangur',
      requestedPath: '/kangur',
    });

    render(<NavigatorProbe href='/kangur/lessons' />);

    fireEvent.click(screen.getByTestId('navigator-replace'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/kangur/lessons',
      pageKey: 'Lessons',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/en/kangur/lessons', { scroll: false });
  });

  it('canonicalizes localized /kangur alias routes when Kangur owns the public frontend', () => {
    frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/kangur');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedHref: '/en/kangur',
      requestedPath: '/kangur',
    });

    render(<NavigatorProbe href='/kangur/lessons?focus=division' />);

    fireEvent.click(screen.getByTestId('navigator-replace'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons?focus=division',
      pageKey: 'Lessons',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/en/lessons?focus=division', {
      scroll: false,
    });
  });

  it('keeps the canonical public route when navigating from root-owned public Kangur routes', () => {
    frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/',
      embedded: false,
      pageKey: 'Game',
      requestedHref: '/en',
      requestedPath: '/',
    });

    render(<NavigatorProbe href='/lessons?focus=division' />);

    fireEvent.click(screen.getByTestId('navigator-replace'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons?focus=division',
      pageKey: 'Lessons',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/en/lessons?focus=division', {
      scroll: false,
    });
  });

  it('preserves the active locale prefix when navigating between root-owned public Kangur routes', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/lessons');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/',
      embedded: false,
      pageKey: 'Lessons',
      requestedHref: '/en/lessons',
      requestedPath: '/lessons',
    });

    render(<NavigatorProbe href='/duels?mode=ranked' />);

    fireEvent.click(screen.getByTestId('navigator-replace'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/duels?mode=ranked',
      pageKey: 'Duels',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/en/duels?mode=ranked', { scroll: false });
  });

  it('keeps an acknowledged push alive after the calling component unmounts', () => {
    vi.useFakeTimers();
    startRouteTransitionMock.mockReturnValueOnce({
      acknowledgeMs: 110,
      started: true,
    });

    const { unmount } = render(<NavigatorPushProbe acknowledgeMs={110} href='/lessons' />);

    fireEvent.click(screen.getByTestId('navigator-push'));
    unmount();
    vi.advanceTimersByTime(110);

    expect(routerPushMock).toHaveBeenCalledWith('/lessons', { scroll: false });
  });

  it('prefetches managed push destinations before navigation starts', () => {
    render(<NavigatorPushProbe acknowledgeMs={0} href='/lessons' />);

    fireEvent.click(screen.getByTestId('navigator-push'));

    expect(routerPrefetchMock).toHaveBeenCalledWith('/lessons');
    expect(routerPushMock).toHaveBeenCalledWith('/lessons', { scroll: false });
  });

  it('bypasses acknowledged navigation delays on coarse-pointer devices', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: coarse)' || query === '(hover: none)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    render(<NavigatorPushProbe acknowledgeMs={110} href='/lessons' />);

    fireEvent.click(screen.getByTestId('navigator-push'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/lessons',
      pageKey: 'Lessons',
    });
    expect(routerPushMock).toHaveBeenCalledWith('/lessons', { scroll: false });
  });

  it('allows a new managed navigation to supersede a stale in-flight transition on the current route', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/kangur/game');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedHref: '/en/kangur/game',
      requestedPath: '/kangur/game',
    });
    useOptionalKangurRouteTransitionStateMock.mockReturnValue({
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Game',
      activeTransitionRequestedHref: '/en/kangur/game',
      activeTransitionSkeletonVariant: 'game-home',
      activeTransitionSourceId: 'kangur-primary-nav:home',
      isRouteAcknowledging: false,
      isRoutePending: true,
      isRouteRevealing: false,
      isRouteWaitingForReady: false,
      pendingPageKey: 'Game',
      transitionPhase: 'pending',
    });

    render(<NavigatorPushProbe acknowledgeMs={110} href='/kangur/lessons' />);

    fireEvent.click(screen.getByTestId('navigator-push'));

    expect(startRouteTransitionMock).not.toHaveBeenCalled();
    expect(routerPushMock).toHaveBeenCalledWith('/en/kangur/lessons', { scroll: false });
  });

  it('pins the fallback page key when starting a managed history-back transition', () => {
    const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const originalHistoryLengthDescriptor = Object.getOwnPropertyDescriptor(window.history, 'length');

    Object.defineProperty(window.history, 'length', {
      configurable: true,
      get: () => 2,
    });

    render(
      <NavigatorBackProbe
        acknowledgeMs={120}
        fallbackHref='/kangur'
        fallbackPageKey='Game'
      />
    );

    fireEvent.click(screen.getByTestId('navigator-back'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 120,
      pageKey: 'Game',
      sourceId: 'lessons:list-back',
    });
    expect(historyBackSpy).toHaveBeenCalledTimes(1);

    if (originalHistoryLengthDescriptor) {
      Object.defineProperty(window.history, 'length', originalHistoryLengthDescriptor);
    }
  });

  it('downgrades blocked GamesLibrary targets to the current accessible page for non-super-admin users', () => {
    sessionMock.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    });

    render(<NavigatorProbe href='/games' />);

    fireEvent.click(screen.getByTestId('navigator-replace'));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/games',
      pageKey: 'Lessons',
    });
    expect(routerReplaceMock).toHaveBeenCalledWith('/games', { scroll: false });
  });
});
