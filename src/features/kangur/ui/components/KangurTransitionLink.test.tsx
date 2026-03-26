/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearKangurPendingRouteLoadingSnapshot,
  getKangurPendingRouteLoadingSnapshot,
} from '@/features/kangur/ui/routing/pending-route-loading-snapshot';

const {
  nextLinkPropsMock,
  startRouteTransitionMock,
  frontendPublicOwnerMock,
  useKangurCoarsePointerMock,
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
  frontendPublicOwnerMock: vi.fn(),
  useKangurCoarsePointerMock: vi.fn(),
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
    prefetch,
    scroll,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    scroll?: boolean;
  }) => {
    nextLinkPropsMock({ href, prefetch, scroll, ...props });
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

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  useOptionalFrontendPublicOwner: () => frontendPublicOwnerMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => useKangurCoarsePointerMock(),
}));

import { KangurTransitionLink } from '@/features/kangur/ui/components/KangurTransitionLink';

describe('KangurTransitionLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearKangurPendingRouteLoadingSnapshot();
    useLocaleMock.mockReturnValue('pl');
    usePathnameMock.mockReturnValue('/kangur');
    useKangurCoarsePointerMock.mockReturnValue(false);
    frontendPublicOwnerMock.mockReturnValue(null);
    useOptionalKangurRouteTransitionStateMock.mockReturnValue(null);
    useOptionalKangurRoutingMock.mockReturnValue(null);
    startRouteTransitionMock.mockReturnValue({
      acknowledgeMs: 0,
      started: true,
    });
  });

  afterEach(() => {
    cleanup();
    clearKangurPendingRouteLoadingSnapshot();
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
        className: 'touch-manipulation select-none',
        href: '/kangur/lessons',
        scroll: false,
      })
    );
    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveAttribute('data-scroll', 'false');
    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveClass(
      'touch-manipulation',
      'select-none'
    );
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

    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveAttribute(
      'href',
      '/en/kangur/lessons'
    );
    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/en/kangur/lessons',
      })
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lekcje' }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/kangur/lessons',
      pageKey: 'Lessons',
    });
    expect(routerPushMock).toHaveBeenCalledWith('/en/kangur/lessons', { scroll: false });
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

    render(
      <KangurTransitionLink href='/kangur/lessons?focus=division'>
        Lekcje
      </KangurTransitionLink>
    );

    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveAttribute(
      'href',
      '/en/lessons?focus=division'
    );
    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/en/lessons?focus=division',
      })
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lekcje' }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons?focus=division',
      pageKey: 'Lessons',
    });
    expect(routerPushMock).toHaveBeenCalledWith('/en/lessons?focus=division', {
      scroll: false,
    });
    expect(getKangurPendingRouteLoadingSnapshot()).toEqual(
      expect.objectContaining({
        href: '/en/lessons?focus=division',
        pageKey: 'Lessons',
        skeletonVariant: 'lessons-focus',
      })
    );
  });

  it('disables Next auto-prefetch for managed local Kangur links by default', () => {
    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/lessons',
        prefetch: false,
      })
    );
    expect(routerPrefetchMock).not.toHaveBeenCalled();
  });

  it('does not trigger manual router prefetch for managed links on coarse-pointer devices', () => {
    useKangurCoarsePointerMock.mockReturnValue(true);

    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    expect(routerPrefetchMock).not.toHaveBeenCalled();
  });

  it('renders a locale-prefixed href before hydration on localized routes', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en/kangur');

    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lessons
      </KangurTransitionLink>
    );

    expect(screen.getByRole('link', { name: 'Lessons' })).toHaveAttribute(
      'href',
      '/en/kangur/lessons'
    );
  });

  it('does not publish the pending target snapshot on pointer-down alone', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/',
      embedded: true,
      pageKey: 'Game',
      requestedHref: '/en',
      requestedPath: '/',
    });

    render(
      <KangurTransitionLink href='/lessons' targetPageKey='Lessons'>
        Lessons
      </KangurTransitionLink>
    );

    fireEvent.pointerDown(screen.getByRole('link', { name: 'Lessons' }), {
      button: 0,
    });

    expect(getKangurPendingRouteLoadingSnapshot()).toBeNull();
  });

  it('publishes the pending target snapshot on click before the router transition starts', () => {
    useLocaleMock.mockReturnValue('en');
    usePathnameMock.mockReturnValue('/en');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/',
      embedded: true,
      pageKey: 'Game',
      requestedHref: '/en',
      requestedPath: '/',
    });

    render(
      <KangurTransitionLink href='/lessons' targetPageKey='Lessons'>
        Lessons
      </KangurTransitionLink>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Lessons' }));

    expect(getKangurPendingRouteLoadingSnapshot()).toMatchObject({
      fromHref: '/en',
      href: '/en/lessons',
      pageKey: 'Lessons',
      skeletonVariant: 'lessons-library',
    });
  });

  it('honors prefetch={false} for managed local links', () => {
    render(
      <KangurTransitionLink href='/kangur/duels' prefetch={false} targetPageKey='Duels'>
        Pojedynki
      </KangurTransitionLink>
    );

    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/duels',
        prefetch: false,
      })
    );
    expect(routerPrefetchMock).not.toHaveBeenCalled();
  });

  it('still allows explicit opt-in prefetch for managed local links', () => {
    render(
      <KangurTransitionLink href='/kangur/duels' prefetch targetPageKey='Duels'>
        Pojedynki
      </KangurTransitionLink>
    );

    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/duels',
        prefetch: true,
      })
    );
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

  it('still pushes the route after a real pointer-down plus click sequence', () => {
    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    const lessonsLink = screen.getByRole('link', { name: 'Lekcje' });
    fireEvent.pointerDown(lessonsLink, { button: 0 });
    fireEvent.click(lessonsLink);

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/kangur/lessons',
      pageKey: 'Lessons',
    });
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
