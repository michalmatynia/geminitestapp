/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startRouteTransitionMock,
  useOptionalKangurRouteTransitionStateMock,
  useOptionalKangurRoutingMock,
  usePathnameMock,
  useLocaleMock,
  routerPrefetchMock,
  routerPushMock,
  routerReplaceMock,
} = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
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

describe('useKangurRouteNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocaleMock.mockReturnValue('pl');
    usePathnameMock.mockReturnValue('/lessons');
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
});
