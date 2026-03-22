/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';

describe('KangurNavAction', () => {
  it('adds touch-friendly sizing to linked navigation actions on coarse pointers', () => {
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
});
