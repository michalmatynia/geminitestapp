/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { nextLinkPropsMock, startRouteTransitionMock, routerPushMock } = vi.hoisted(() => ({
  nextLinkPropsMock: vi.fn(),
  startRouteTransitionMock: vi.fn(),
  routerPushMock: vi.fn(),
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
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransition: () => ({
    isRoutePending: false,
    pendingPageKey: null,
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
      <KangurTransitionLink href='/kangur/tests' scroll targetPageKey='Tests'>
        Testy
      </KangurTransitionLink>
    );

    expect(nextLinkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: '/kangur/tests',
        scroll: true,
      })
    );
    expect(screen.getByRole('link', { name: 'Testy' })).toHaveAttribute('data-scroll', 'true');
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
});
