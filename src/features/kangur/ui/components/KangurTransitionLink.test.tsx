/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  nextLinkPropsMock,
  startRouteTransitionMock,
  routerPushMock,
  routerReplaceMock,
  routerPrefetchMock,
} = vi.hoisted(() => ({
  nextLinkPropsMock: vi.fn(),
  startRouteTransitionMock: vi.fn(),
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  routerPrefetchMock: vi.fn(),
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
}));

import { KangurTransitionLink } from '@/features/kangur/ui/components/KangurTransitionLink';

describe('KangurTransitionLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        Strona glowna
      </KangurTransitionLink>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Strona glowna' }));

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

  it('prefetches managed local links while mounted', () => {
    render(
      <KangurTransitionLink href='/kangur/lessons' targetPageKey='Lessons'>
        Lekcje
      </KangurTransitionLink>
    );

    expect(routerPrefetchMock).toHaveBeenCalledWith('/kangur/lessons');
  });
});
