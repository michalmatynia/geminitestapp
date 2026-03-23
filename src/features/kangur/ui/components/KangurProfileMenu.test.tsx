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

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionState: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';

describe('KangurProfileMenu', () => {
  it('uses touch-friendly coarse-pointer sizing for the profile trigger', () => {
    render(
      <KangurProfileMenu
        label='Profil ucznia'
        profile={{ href: '/kangur/profile' }}
      />
    );

    expect(screen.getByRole('link', { name: 'Profil ucznia' })).toHaveClass(
      'min-h-12',
      'px-4',
      'touch-manipulation'
    );
  });
});
