/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  nextLinkPropsMock,
  startRouteTransitionMock,
  useOptionalKangurRouteTransitionStateMock,
  useOptionalKangurRoutingMock,
  useLocaleMock,
  usePathnameMock,
  routerPushMock,
  routerReplaceMock,
  routerPrefetchMock,
} = vi.hoisted(() => ({
  nextLinkPropsMock: vi.fn(),
  startRouteTransitionMock: vi.fn(),
  useOptionalKangurRouteTransitionStateMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  useLocaleMock: vi.fn(),
  usePathnameMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  routerPrefetchMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: useLocaleMock,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => {
    nextLinkPropsMock({ href, scroll, ...props });
    return (
      <a href={href} data-scroll={scroll === undefined ? 'unset' : String(scroll)} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
    prefetch: routerPrefetchMock,
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

import { KangurTransitionLink } from '@/features/kangur/ui/components/KangurTransitionLink';

describe('KangurTransitionLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocaleMock.mockReturnValue('pl');
    usePathnameMock.mockReturnValue('/kangur');
    useOptionalKangurRouteTransitionStateMock.mockReturnValue(null);
    useOptionalKangurRoutingMock.mockReturnValue(null);
    startRouteTransitionMock.mockReturnValue({
      acknowledgeMs: 0,
      started: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disables Next auto-scroll for internal Kangur route transitions', () => {
    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/lessons',
        scroll: false,
      })
    );
    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveAttribute('data-scroll', 'false');
  });

  it('preserves an explicit scroll override from the caller', () => {
    render(
      <KangurTransitionLink href='/kangur/lessons?focus=division' scroll targetPageKey='Lessons'>
        Lekcje z fokusem
      </KangurTransitionLink>
    );

    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/lessons?focus=division',
        scroll: true,
      })
    );
    expect(screen.getByRole('link', { name: 'Lekcje z fokusem' })).toHaveAttribute(
      'data-scroll',
      'true'
    );
  });

  it('starts the shared Kangur route transition when an internal link is clicked', () => {
    render(
      <KangurTransitionLink href='/kangur' targetPageKey='Game'>
        Strona główna
      </KangurTransitionLink>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Strona główna' }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/kangur',
      pageKey: 'Game',
    });
    expect(routerPushMock).toHaveBeenCalledWith('/kangur', { scroll: false });
  });

  it('starts the shared transition with targetPageKey when navigating to Lessons', () => {
    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lekcje' }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/kangur/lessons',
      pageKey: 'Lessons',
    });
    expect(routerPushMock).toHaveBeenCalledWith('/kangur/lessons', { scroll: false });
  });

  it('preserves the active locale prefix when clicking Lessons from a localized route', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/kangur');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedHref: '/en/kangur',
      requestedPath: '/kangur',
    });

    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lekcje' }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/kangur/lessons',
      pageKey: 'Lessons',
    });
    expect(routerPushMock).toHaveBeenCalledWith('/en/kangur/lessons', { scroll: false });
  });

  it('prefetches managed local links while mounted', () => {
    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    expect(routerPrefetchMock).toHaveBeenCalledWith('/kangur/lessons');
  });

  it('delays the router push until the button acknowledgement window ends', () => {
    vi.useFakeTimers();
    startRouteTransitionMock.mockReturnValueOnce({
      acknowledgeMs: 110,
      started: true,
    });

    render(
      <KangurTransitionLink
        href='/kangur/lessons'
        targetPageKey='Lessons'
        transitionAcknowledgeMs={110}
        transitionSourceId='game-home-action:lessons'
      >
        Lekcje
      </KangurTransitionLink>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lekcje' }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 110,
      href: '/kangur/lessons',
      pageKey: 'Lessons',
      sourceId: 'game-home-action:lessons',
    });
    expect(routerPushMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(110);

    expect(routerPushMock).toHaveBeenCalledWith('/kangur/lessons', { scroll: false });
  });

  it('does not let stale waiting-for-ready state block navigation away from the committed page', () => {
    usePathnameMock.mockReturnValue('/kangur/lessons');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Lessons',
      requestedHref: '/kangur/lessons',
      requestedPath: '/kangur/lessons',
    });
    useOptionalKangurRouteTransitionStateMock.mockReturnValue({
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/kangur/lessons',
      activeTransitionSkeletonVariant: 'lessons',
      activeTransitionSourceId: 'top-nav:lessons',
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteRevealing: false,
      isRouteWaitingForReady: true,
      pendingPageKey: null,
      transitionPhase: 'waiting_for_ready',
    });
    startRouteTransitionMock.mockReturnValue({
      acknowledgeMs: 0,
      started: false,
    });

    render(
      <KangurTransitionLink href='/kangur/profile' targetPageKey='LearnerProfile'>
        Profil
      </KangurTransitionLink>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Profil' }));

    expect(routerPushMock).toHaveBeenCalledWith('/kangur/profile', { scroll: false });
  });
});
