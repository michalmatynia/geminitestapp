/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { routeNavigatorPrefetchMock } = vi.hoisted(() => ({
  routeNavigatorPrefetchMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    scroll?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    prefetch: routeNavigatorPrefetchMock,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';

describe('KangurNavAction', () => {
  it('adds touch-friendly sizing to linked navigation actions on coarse pointers with managed prefetch', () => {
    render(
      <KangurNavAction href='/kangur/lessons' size='sm' targetPageKey='Lessons'>
        Lekcje
      </KangurNavAction>
    );

    expect(screen.getByRole('link', { name: 'Lekcje' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(routeNavigatorPrefetchMock).toHaveBeenCalledWith('/kangur/lessons');
  });

  it('can disable managed prefetch for linked navigation actions', () => {
    render(
      <KangurNavAction
        href='/kangur/duels'
        prefetch={false}
        size='sm'
        targetPageKey='Duels'
      >
        Pojedynki
      </KangurNavAction>
    );

    expect(routeNavigatorPrefetchMock).not.toHaveBeenCalledWith('/kangur/duels');
  });

  it('adds touch-friendly sizing to button navigation actions on coarse pointers', () => {
    render(
      <KangurNavAction onClick={() => undefined} size='md'>
        Akcja
      </KangurNavAction>
    );

    expect(screen.getByRole('button', { name: 'Akcja' })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
  });

  it('shows a pressed state immediately on pointer down before the route handoff resolves', () => {
    render(
      <KangurNavAction href='/kangur/lessons' size='md' targetPageKey='Lessons'>
        Lekcje
      </KangurNavAction>
    );

    const action = screen.getByRole('link', { name: 'Lekcje' });

    expect(action).toHaveAttribute('data-nav-state', 'idle');

    fireEvent.pointerDown(action);

    expect(action).toHaveAttribute('data-nav-state', 'pressed');
    expect(action).toHaveClass('kangur-nav-item-active');

    fireEvent.pointerUp(action);

    expect(action).toHaveAttribute('data-nav-state', 'idle');
  });

  it('keeps the nav action in the transitioning state while the managed route handoff is active', () => {
    render(
      <KangurNavAction
        href='/kangur/lessons'
        size='md'
        targetPageKey='Lessons'
        transition={{ active: true, sourceId: 'kangur-primary-nav:lessons' }}
      >
        Lekcje
      </KangurNavAction>
    );

    const action = screen.getByRole('link', { name: 'Lekcje' });

    expect(action).toHaveAttribute('data-nav-state', 'transitioning');
    expect(action).toHaveClass('kangur-nav-item-active');
  });
});
