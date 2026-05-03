/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { standaloneHomeReadyMock } = vi.hoisted(() => ({
  standaloneHomeReadyMock: vi.fn(() => true),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurDeferredStandaloneHomeReady', () => ({
  useKangurDeferredStandaloneHomeReady: () => standaloneHomeReadyMock(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { KangurElevatedUserMenu } from '@/features/kangur/ui/components/KangurElevatedUserMenu';

describe('KangurElevatedUserMenu', () => {
  afterEach(() => {
    standaloneHomeReadyMock.mockReturnValue(true);
  });

  it('falls back to the initial before standalone home idle is ready', () => {
    standaloneHomeReadyMock.mockReturnValue(false);

    render(
      <KangurElevatedUserMenu
        adminLabel='Admin'
        logoutLabel='Wyloguj'
        onLogout={vi.fn()}
        triggerAriaLabel='Awatar administratora'
        user={{
          email: 'admin@example.com',
          image: '/avatars/kangur/pixel-panda.svg',
          name: 'Super Admin',
          role: 'super_admin',
        }}
      />
    );

    const trigger = screen.getByTestId('kangur-elevated-user-menu-trigger');
    expect(trigger.querySelector('img')).toBeNull();
    expect(trigger).toHaveTextContent('S');
  });

  it('renders an avatar trigger and exposes admin and logout actions', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();

    render(
      <KangurElevatedUserMenu
        adminLabel='Admin'
        logoutLabel='Wyloguj'
        onLogout={onLogout}
        triggerAriaLabel='Awatar administratora'
        user={{
          email: 'admin@example.com',
          image: '/avatars/kangur/pixel-panda.svg',
          name: 'Super Admin',
          role: 'super_admin',
        }}
      />
    );

    const trigger = screen.getByTestId('kangur-elevated-user-menu-trigger');
    const avatarImage = trigger.querySelector('img');

    expect(avatarImage).not.toBeNull();
    expect(avatarImage).toHaveAttribute('src', '/avatars/kangur/pixel-panda.svg');
    expect(avatarImage).toHaveAttribute('loading', 'lazy');
    expect(avatarImage).toHaveAttribute('decoding', 'async');
    expect(avatarImage).toHaveAttribute('fetchpriority', 'low');

    await user.click(trigger);

    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin');

    await user.click(screen.getByRole('menuitem', { name: 'Wyloguj' }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('keeps the menu limited to admin and logout actions', async () => {
    const user = userEvent.setup();

    render(
      <KangurElevatedUserMenu
        adminLabel='Admin'
        logoutLabel='Wyloguj'
        onLogout={vi.fn()}
        triggerAriaLabel='Awatar administratora'
        user={{
          email: 'admin@example.com',
          image: null,
          name: 'Super Admin',
          role: 'super_admin',
        }}
      />
    );

    await user.click(screen.getByTestId('kangur-elevated-user-menu-trigger'));

    expect(screen.queryByRole('menuitem', { name: /profil/i })).toBeNull();
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('menuitem', { name: 'Wyloguj' })).toBeInTheDocument();
  });
});
