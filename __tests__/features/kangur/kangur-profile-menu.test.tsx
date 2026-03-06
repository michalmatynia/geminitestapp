/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';

describe('KangurProfileMenu', () => {
  it('opens a menu with Status and Wyloguj for authenticated users', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <KangurProfileMenu
        basePath='/kangur'
        isAuthenticated
        onLogout={onLogout}
        onLogin={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Profil' }));

    const statusLink = screen.getByText('Status').closest('a');
    expect(statusLink).toHaveAttribute('href', '/kangur/profile');

    await user.click(screen.getByRole('menuitem', { name: 'Wyloguj' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows a login action for anonymous users', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    render(
      <KangurProfileMenu
        basePath='/kangur'
        isAuthenticated={false}
        onLogout={vi.fn()}
        onLogin={onLogin}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Profil' }));
    await user.click(screen.getByRole('menuitem', { name: 'Zaloguj się' }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});
