/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
}));

const { standaloneHomeReadyMock } = vi.hoisted(() => ({
  standaloneHomeReadyMock: vi.fn(() => true),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady', () => ({
  useKangurDeferredStandaloneHomeReady: () => standaloneHomeReadyMock(),
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
  afterEach(() => {
    standaloneHomeReadyMock.mockReturnValue(true);
  });

  it('falls back to the default profile icon before standalone home idle is ready', () => {
    localeMock.mockReturnValue('pl');
    standaloneHomeReadyMock.mockReturnValue(false);

    render(
      <KangurProfileMenu
        avatar={{ label: 'Lisek', src: '/avatars/kangur/star-fox.svg' }}
        label='Profil Maja'
        profile={{ href: '/kangur/profile' }}
      />
    );

    const profileLink = screen.getByRole('link', { name: 'Profil Maja' });
    expect(profileLink.querySelector('img')).toBeNull();
    expect(profileLink.querySelector('svg')).not.toBeNull();

  });

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

  it('renders the learner avatar inside the direct profile link when an avatar is provided', () => {
    localeMock.mockReturnValue('pl');

    render(
      <KangurProfileMenu
        avatar={{ label: 'Lisek', src: '/avatars/kangur/star-fox.svg' }}
        label='Profil Maja'
        profile={{ href: '/kangur/profile' }}
      />
    );

    const profileLink = screen.getByRole('link', { name: 'Profil Maja' });
    const avatarImage = profileLink.querySelector('img');

    expect(avatarImage).not.toBeNull();
    expect(avatarImage).toHaveAttribute('src', '/avatars/kangur/star-fox.svg');
    expect(avatarImage).toHaveAttribute('loading', 'lazy');
    expect(avatarImage).toHaveAttribute('decoding', 'async');
    expect(avatarImage).toHaveAttribute('fetchpriority', 'low');
  });
});
