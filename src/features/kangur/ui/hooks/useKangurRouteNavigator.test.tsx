/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  startRouteTransitionMock,
  useOptionalKangurRouteTransitionStateMock,
  useOptionalKangurRoutingMock,
  usePathnameMock,
  routerPrefetchMock,
  routerReplaceMock,
} = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
  useOptionalKangurRouteTransitionStateMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  usePathnameMock: vi.fn(),
  routerPrefetchMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({
    back: vi.fn(),
    prefetch: routerPrefetchMock,
    push: vi.fn(),
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

describe('useKangurRouteNavigator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
