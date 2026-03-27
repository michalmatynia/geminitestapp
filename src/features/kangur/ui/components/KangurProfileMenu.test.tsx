/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
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
    localeMock.mockReturnValue('pl');
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

  it('uses an English fallback label when none is provided on the English route', () => {
    localeMock.mockReturnValue('en');

    render(<KangurProfileMenu profile={{ href: '/kangur/profile' }} />);

    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });
});
